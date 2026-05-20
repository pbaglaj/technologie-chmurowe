# CHECKLIST — Projekt Kubernetes (Notes API)

Karta sprawdzająca do projektu **kubernetes-project**. Wszystkie polecenia są
przygotowane tak, aby dało się je przekleić do terminala (Linux/macOS/WSL/PowerShell)
i w ciągu ~20 minut zweryfikować architekturę, trwałość danych, CI/CD i punkty
dodatkowe.

> Repozytorium: `technologie-chmurowe/kubernetes-project`
> Stos: Node.js 20 (API) + PostgreSQL 16 (StatefulSet + PVC) + Redis 7 (cache) +
> Kustomize (base + overlays dev/prod) + GitHub Actions (build → GHCR → k3d → rollout).

---

## 0. Wymagania wstępne

| Narzędzie | Wersja sprawdzona | Notatka |
|-----------|-------------------|---------|
| Docker    | 24+               | do buildu i k3d |
| k3d       | v5.7+             | lekka dystrybucja k3s w Dockerze |
| kubectl   | v1.30+            | klient klastra |
| kustomize | v5.4+             | (opcjonalnie — `kubectl -k` też wystarczy) |
| curl, jq  | dowolne           | do testów HTTP |

```bash
docker version
k3d version
kubectl version --client
kustomize version
```

---

## 1. Uruchomienie lokalnego klastra (k3d)

```bash
# Lokalny klaster z mapowaniem portu 8080 → 80 loadbalancera k3d
k3d cluster create notes -p "8080:80@loadbalancer" --agents 1 --wait
kubectl cluster-info
kubectl get nodes -o wide
```

Oczekiwane: `Ready` na wszystkich węzłach. Jeśli używasz **minikube**:

```bash
minikube start --addons=ingress
```

lub **kind**:

```bash
kind create cluster --name notes
```

---

## 2. Wdrożenie aplikacji

### 2a. Dev (lokalne testy, port-forward zamiast Ingressa)

```bash
kubectl apply -k k8s/overlays/dev
kubectl -n notes-dev get all
```

### 2b. Prod (Ingress, NetworkPolicy, PDB, HPA)

```bash
# UWAGA: produkcyjny overlay zawiera placeholder hasła do bazy.
# W CI podmienia je workflow; lokalnie podmień ręcznie przed deployem:
sed -i.bak "s|PLACEHOLDER_REPLACED_BY_CI|$(openssl rand -hex 24)|" \
  k8s/overlays/prod/kustomization.yaml

kubectl apply -k k8s/overlays/prod
kubectl -n notes-prod get all
```

> Niezależnie od overlaya: pierwszy apply tworzy Namespace, ConfigMap, Secret,
> StatefulSet bazy + PVC, Deployment Redisa, Job migracji oraz Deployment API
> (z initContainerem czekającym na bazę i Redisa).

---

## 3. Weryfikacja architektury

### 3.1 Lista zasobów (sprawdza wymóg Manifesty K8s)

```bash
NS=notes-dev          # lub notes-prod
kubectl -n $NS get ns,deploy,sts,svc,ingress,cm,secret,pvc,job
```

Oczekiwane (overlay dev):

```
NAME                              READY   STATUS
namespace/notes-dev               Active
deployment.apps/api               2/2
deployment.apps/redis             1/1
statefulset.apps/postgres         1/1
service/api                       ClusterIP
service/postgres                  ClusterIP (Headless)
service/redis                     ClusterIP
ingress.networking.k8s.io/api     traefik   ...
configmap/notes-config            ...
configmap/notes-migrations        ...
secret/notes-secret               Opaque
persistentvolumeclaim/data-postgres-0   Bound
job.batch/notes-migrate           1/1
```

### 3.2 Rolling update backendu (wymóg: 2 repliki + RollingUpdate)

```bash
kubectl -n $NS get deploy api -o jsonpath='{.spec.strategy.type}'; echo
kubectl -n $NS rollout status deploy/api
kubectl -n $NS rollout history deploy/api

# Wymuszenie restartu rolloutu jako dowód:
kubectl -n $NS rollout restart deploy/api
kubectl -n $NS rollout status deploy/api
```

### 3.3 Probes + zasoby

```bash
kubectl -n $NS describe deploy api | grep -E "Liveness|Readiness|Limits|Requests"
```

### 3.4 SecurityContext (non-root)

```bash
kubectl -n $NS get pod -l app.kubernetes.io/name=api \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.securityContext.runAsUser}{"\n"}{end}'
# Oczekiwane: runAsUser = 10001 dla każdego poda API
```

### 3.5 Izolacja sieciowa (DB/Redis nie wystawione)

```bash
kubectl -n $NS get svc postgres redis -o jsonpath='{range .items[*]}{.metadata.name}={.spec.type}{"\n"}{end}'
# Oczekiwane: postgres=ClusterIP, redis=ClusterIP (żadnego NodePort/LoadBalancer)

kubectl -n $NS get ingress
# Oczekiwane: tylko reguły kierujące do svc/api
```

### 3.6 Ingress działa, baza/redis nie odpowiadają z zewnątrz

```bash
# Dev z k3d-em mapuje 8080 → 80 LB → Ingress
curl -sS http://localhost:8080/health

# Próba dotarcia do bazy z zewnątrz powinna się NIE udać
# (przykład: port-forward jako "kontrola pozytywna" - tylko admin może)
( timeout 3 bash -c 'cat </dev/tcp/localhost/5432' ) 2>&1 || echo "OK: baza nieosiągalna z hosta"
```

---

## 4. Test funkcjonalności + trwałość danych (kluczowe!)

```bash
NS=notes-dev
# Tunel diagnostyczny niezależny od Ingressa
kubectl -n $NS port-forward svc/api 8081:80 >/tmp/pf.log 2>&1 &
PF=$!
sleep 2

# (1) dodanie danych
curl -sS -X POST -H 'Content-Type: application/json' \
  -d '{"content":"pierwsza notatka"}' http://localhost:8081/api/notes
curl -sS -X POST -H 'Content-Type: application/json' \
  -d '{"content":"druga notatka"}'    http://localhost:8081/api/notes

# (2) odczyt - powinien zwrócić obie notatki
curl -sS http://localhost:8081/api/notes

# (3) usunięcie poda bazy
kubectl -n $NS delete pod postgres-0
kubectl -n $NS wait --for=condition=Ready pod/postgres-0 --timeout=120s

# (4) ponowny odczyt - dane MUSZĄ tam być (dowód PVC)
curl -sS http://localhost:8081/api/notes

kill $PF
```

Oczekiwany wynik kroku (4): te same dwie notatki co w kroku (2).

---

## 5. Cache / Redis – dowód działania

Endpoint `/api/notes` zwraca pole `source`:

* pierwsze wywołanie po zapisie/usunięciu → `"source":"db"`
* kolejne w oknie TTL (`CACHE_TTL_SECONDS=30`) → `"source":"cache"`

```bash
curl -sS http://localhost:8081/api/notes | jq -r '.source'   # db
curl -sS http://localhost:8081/api/notes | jq -r '.source'   # cache
```

Metryki Prometheusa potwierdzają liczniki:

```bash
curl -sS http://localhost:8081/metrics | grep -E '^notes_cache_(hits|misses)_total'
```

---

## 6. Obserwowalność (`/metrics`)

```bash
curl -sS http://localhost:8081/metrics | head -40
```

Adnotacje scrape'owania znajdują się na podzie API (Prometheus auto-discovery):

```bash
kubectl -n $NS get pod -l app.kubernetes.io/name=api \
  -o jsonpath='{.items[0].metadata.annotations}' | jq
# prometheus.io/scrape=true, prometheus.io/port=3000, prometheus.io/path=/metrics
```

---

## 7. ConfigMap & Secret – brak haseł w kodzie

```bash
# konfiguracja jawna w ConfigMap
kubectl -n $NS get cm notes-config -o yaml

# poufne wartości tylko w Secret (zakodowane base64 - nie commitujemy)
kubectl -n $NS get secret notes-secret -o jsonpath='{.data}' | jq 'keys'

grep -R "PLACEHOLDER_REPLACED_BY_CI" k8s/overlays/prod || true
# Dev overlay używa wartości generowanej przez secretGenerator (nie hardcodowanej w app)
```

---

## 8. Punkty dodatkowe

### 8.1 NetworkPolicy (prod overlay)

```bash
kubectl -n notes-prod get netpol
kubectl -n notes-prod describe netpol allow-postgres-from-api
```

Reguły:
* `default-deny` (ingress) – wszystkie pody w namespace startują z zamkniętym wejściem,
* `allow-api-ingress` – ruch do API tylko z ingress-controllera i innych podów w ns,
* `allow-postgres-from-api` – do bazy puszczamy tylko pody API i Job migracji,
* `allow-redis-from-api` – Redis dostępny wyłącznie dla API.

### 8.2 PodDisruptionBudget (prod overlay)

```bash
kubectl -n notes-prod get pdb api
# MIN AVAILABLE = 1
```

### 8.3 Kustomize, dwa środowiska

```
k8s/
├── base/             # wspólne manifesty
└── overlays/
    ├── dev/          # 2 repliki, minimalne resources, ingress lokalny
    └── prod/         # 3 repliki, HPA, NetworkPolicy, PDB, Ingress prod
```

### 8.4 InitContainer (czekanie na bazę)

```bash
kubectl -n $NS describe pod -l app.kubernetes.io/name=api | sed -n '/Init Containers/,/Containers:/p'
```

oraz Job migracji (`Job/notes-migrate`):

```bash
kubectl -n $NS get job notes-migrate
kubectl -n $NS logs job/notes-migrate
```

### 8.5 Obserwowalność – patrz sekcja 6.

---

## 9. CI/CD GitHub Actions

* Plik workflow: [`.github/workflows/k8s-deploy.yml`](../.github/workflows/k8s-deploy.yml)
* Joby:
  1. **lint-and-test** – `node --check`, `kustomize build`, `kubeconform` na obu overlay'ach.
  2. **build-and-push** – Buildx → GHCR (`ghcr.io/<owner>/<repo>/notes-api:sha-<sha>`).
  3. **deploy-k3d** – tworzy ephemeryczny k3d, podmienia tag w Kustomize, deployuje overlay `prod`,
     czeka na `rollout status` STS/Deploymentów, robi smoke-testy curl-em.

Po każdym mergu do `main` wyjściowy workflow powinien być widoczny tutaj:

> **Link do ostatniego udanego runa:** _https://github.com/pbaglaj/technologie-chmurowe/actions/runs/26150792483_

---

## 10. Sprzątanie

```bash
kubectl delete -k k8s/overlays/dev  || true
kubectl delete -k k8s/overlays/prod || true
k3d cluster delete notes
```

---

## 11. Mapowanie wymagań → artefakty repo

| Wymaganie (waga) | Gdzie spełnione |
|------------------|-----------------|
| Manifesty (Namespace, Deployment, StatefulSet, Service, Ingress, ConfigMap, Secret, PVC) – 12% | `k8s/base/*` + `overlays/*/ingress.yaml` |
| Deploymenty + rolling update (≥2 repliki) – 10% | `k8s/base/api-deployment.yaml` (replicas:2, RollingUpdate) |
| Baza + PVC – 12% | `k8s/base/postgres-statefulset.yaml` (`volumeClaimTemplates`) |
| Services + Ingress + izolacja – 10% | wszystkie svc ClusterIP, Ingress tylko dla API |
| ConfigMap + Secret – 8% | `configmap.yaml` + `secretGenerator` w overlay'ach |
| Probes + resources – 10% | każdy główny kontener |
| SecurityContext + initContainer/Job – 8% | non-root w API/Redis/Postgres; init wait + `Job/notes-migrate` |
| CI/CD – 10% | `.github/workflows/k8s-deploy.yml` |
| NetworkPolicy – 2.5% | `overlays/prod/network-policy.yaml` |
| PodDisruptionBudget – 2.5% | `overlays/prod/pdb.yaml` |
| Helm/Kustomize, 2 środowiska – 2.5% | `overlays/dev`, `overlays/prod` |
| Obserwowalność – 2.5% | `/metrics` + adnotacje Prometheusa |
| CRUD + /health (specyficzne) – 10% | `app/index.js` |
| Trwałość po restarcie poda – 5% | sekcja 4 tego pliku |
| Cache/worker – 5% | Redis + `source: db|cache` w odpowiedzi |
