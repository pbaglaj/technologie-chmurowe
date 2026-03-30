## Lab 04 - Część 1

### 1) Uruchom lokalny rejestr

```bash
docker run -d \
  -p 5000:5000 \
  --restart=always \
  --name lokalny-rejestr \
  registry:2
```

### 2) Zbuduj i otaguj obrazy

#### Backend

```bash
docker build -t localhost:5000/dashboard-backend:v1 ./backend
docker tag localhost:5000/dashboard-backend:v1 localhost:5000/dashboard-backend:latest
```

#### Frontend

```bash
docker build -t localhost:5000/dashboard-frontend:v1 ./frontend
docker tag localhost:5000/dashboard-frontend:v1 localhost:5000/dashboard-frontend:latest
```

### 3) Wypchnij obrazy do lokalnego rejestru

```bash
docker push localhost:5000/dashboard-backend:v1
docker push localhost:5000/dashboard-backend:latest

docker push localhost:5000/dashboard-frontend:v1
docker push localhost:5000/dashboard-frontend:latest
```

### 4) (Opcjonalnie) Usuń lokalne obrazy

```bash
docker rmi localhost:5000/dashboard-frontend:latest localhost:5000/dashboard-frontend:v1
docker rmi localhost:5000/dashboard-backend:latest localhost:5000/dashboard-backend:v1
```

### 5) Pobierz obrazy i uruchom środowisko

#### Pobranie obrazów

```bash
docker pull localhost:5000/dashboard-backend:latest
docker pull localhost:5000/dashboard-frontend:latest
```

#### Utworzenie sieci

```bash
docker network create dashboard-net
```

#### Uruchom backend (bez publikacji portu)

```bash
docker run -d --name backend \
  --network dashboard-net \
  localhost:5000/dashboard-backend:latest
```

#### Uruchom frontend (Nginx + reverse proxy)

```bash
docker run -d --name frontend \
  --network dashboard-net \
  -p 8080:80 \
  localhost:5000/dashboard-frontend:latest
```

### 6) Testy

#### Test 1: SPA i React Router (`/`, `/products`, `/stats`)

```bash
curl -I http://localhost:8080/
curl -I http://localhost:8080/products
curl -I http://localhost:8080/stats
```

#### Test 2: API przez proxy Nginx

```bash
curl -X POST http://localhost:8080/api/items -H "Content-Type: application/json" -d '{"name": "Laptop DevOps"}'
# Oczekiwany wynik: {"success":true}

curl http://localhost:8080/api/items
# Oczekiwany wynik: [{"id":1681234567890,"name":"Laptop DevOps"}]
```

#### Test 3: cache na ścieżce `/api/stats`

```bash
curl -i http://localhost:8080/api/stats
```

---

## Lab 04 - Część 2

### 1) Zbuduj nowe obrazy

```bash
docker build -t localhost:5000/dashboard-backend:latest ./backend

# Zbudowanie obrazu z tagiem v2
docker build -t localhost:5000/dashboard-frontend:v2 ./frontend
```

### 2) Wypchnij nową wersję frontendu

```bash
docker push localhost:5000/dashboard-frontend:v2
```

### 3) Uruchom dwa backendy i frontend v2

```bash
# 1. Zatrzymanie i usunięcie starych kontenerów (jeśli działają)
docker rm -f frontend api-a api-b 2>/dev/null

# 2. Uruchomienie instancji A z parametrem INSTANCE_ID
docker run -d --name api-a \
  --network dashboard-net \
  -e INSTANCE_ID="Backend-Node-A" \
  localhost:5000/dashboard-backend:latest

# 3. Uruchomienie instancji B z parametrem INSTANCE_ID
docker run -d --name api-b \
  --network dashboard-net \
  -e INSTANCE_ID="Backend-Node-B" \
  localhost:5000/dashboard-backend:latest

# 4. Uruchomienie zaktualizowanego frontendu (v2)
docker run -d --name frontend \
  --network dashboard-net \
  -p 8080:80 \
  localhost:5000/dashboard-frontend:v2
```

### 4) Test

```bash
curl -i http://localhost:8080/api/stats
```

---

## Lab 05 - Multi-arch (Buildx)

### 1) Uruchom lokalny rejestr

```bash
docker run -d -p 5000:5000 --restart=always --name lokalny-rejestr registry:2
```

### 2) Utwórz i aktywuj builder multi-arch

```bash
docker buildx create \
  --name multiarch-builder \
  --driver docker-container \
  --driver-opt network=host \
  --use \
  --bootstrap
```

### 3) Zweryfikuj builder

```bash
docker buildx inspect multiarch-builder
```

### 4) Build i push backendu (`linux/amd64`, `linux/arm64`)

```bash
cd backend
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t localhost:5000/dashboard-backend:v3 \
  --push .
```

### 5) Build i push frontendu (`linux/amd64`, `linux/arm64`)

```bash
cd ../frontend
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t localhost:5000/dashboard-frontend:v3 \
  --push .
```

### 6) Weryfikacja manifestu obrazu

```bash
docker buildx imagetools inspect localhost:5000/dashboard-backend:v3
```

### 7) Testowanie środowiska po zmianach

```bash
# Konfiguracja środowiska uruchomieniowego
docker rm -f api-a api-b frontend 2>/dev/null

docker run -d --name api-a \
  --network dashboard-net \
  -e INSTANCE_ID="Backend-Node-A" \
  localhost:5000/dashboard-backend:v3

docker run -d --name api-b \
  --network dashboard-net \
  -e INSTANCE_ID="Backend-Node-B" \
  localhost:5000/dashboard-backend:v3

# Ze względu na zmianę portu z 80 na 8080 w kontenerze frontendowym:
docker run -d --name frontend \
  --network dashboard-net \
  -p 8080:8080 \
  localhost:5000/dashboard-frontend:v3

curl http://localhost:8080/api/health
curl http://localhost:8080/api/stats
```

## Lab 05 - Część 2

### Ustawienie zmiennych powłoki
```bash
export BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
export VERSION=v4
```

### BUDOWANIE BACKENDU (uruchomi automatycznie etap `test`)
```bash
cd backend
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg BUILD_DATE=$BUILD_DATE \
  --build-arg VERSION=$VERSION \
  --build-arg NODE_ENV=production \
  -t localhost:5000/dashboard-backend:$VERSION \
  --push .
```

### BUDOWANIE FRONTENDU
```bash
cd ../frontend
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg BUILD_DATE=$BUILD_DATE \
  --build-arg VERSION=$VERSION \
  --build-arg NODE_ENV=production \
  -t localhost:5000/dashboard-frontend:$VERSION \
  --push .
```

### 6. Weryfikacja: Etykiety OCI i skuteczność .dockerignore
```bash
docker pull localhost:5000/dashboard-backend:v4
docker inspect localhost:5000/dashboard-backend:v4 --format '{{range $k, $v := .Config.Labels}}{{println $k ":" $v}}{{end}}'
```