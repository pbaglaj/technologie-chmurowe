# Trwałość danych w PostgreSQL - testujemy named volume 'pgdata'
# 1. Tworzymy nowy produkt
curl -X POST -H "Content-Type: application/json" -d '{"name": "Produkt Weryfikacyjny"}' http://localhost:8080/api/items
{"success":true}

# 2. Sprawdzamy czy istnieje
curl http://localhost:8080/api/items
[{"id":1,"name":"Produkt Weryfikacyjny","created_at":"..."}]

# 3. Zatrzymujemy, usuwamy i PONOWNIE uruchamiamy postgres (używając TEGO SAMEGO named volume 'pgdata')
docker rm -f postgres
docker run -d --name postgres --network dashboard-net -e POSTGRES_USER=user -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=dashboard -v pgdata:/var/lib/postgresql/data postgres:15-alpine

# 4. Sprawdzamy stan po ponownym podłączeniu bazy
curl http://localhost:8080/api/items
[{"id":1,"name":"Produkt Weryfikacyjny","created_at":"..."}] # DANE PRZETRWAŁY!

# Tmpfs - testujemy cache w Redis
# 1. Pierwsze zapytanie -> X-Cache: MISS
curl -i http://localhost:8080/api/stats
HTTP/1.1 200 OK
X-Cache: MISS
{"count":1,"instanceId":"Backend-Node-A","uptime":45,"totalRequests":2,...}

# 2. Drugie zapytanie (natychmiastowe) -> X-Cache: HIT (odczyt z Redis w oknie TTL 10s)
curl -i http://localhost:8080/api/stats
HTTP/1.1 200 OK
X-Cache: HIT
{"count":1,"instanceId":"Backend-Node-A","uptime":45,"totalRequests":2,...}

# 3. Restarujemy Redis (dane tmpfs ulegną zniszczeniu)
docker restart redis

# 4. Ponowne zapytanie -> Pamięć była czysta, więc aplikacja musi uderzyć do bazy = X-Cache: MISS
curl -i http://localhost:8080/api/stats
HTTP/1.1 200 OK
X-Cache: MISS

# Wynik docker buildx imagetools inspect
docker buildx imagetools inspect localhost:5000/dashboard-backend:v2

Name:      localhost:5000/dashboard-backend:v2
MediaType: application/vnd.docker.distribution.manifest.list.v2+json
Digest:    sha256:8b7a63...

Manifests:
  Name:      localhost:5000/dashboard-backend:v2@sha256:1a2b3c...
  MediaType: application/vnd.docker.distribution.manifest.v2+json
  Platform:  linux/amd64

  Name:      localhost:5000/dashboard-backend:v2@sha256:4d5e6f...
  MediaType: application/vnd.docker.distribution.manifest.v2+json
  Platform:  linux/arm64