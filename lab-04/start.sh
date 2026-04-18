#!/bin/bash
# 1. Czyścimy
docker rm -f postgres redis backend frontend 2>/dev/null
docker network create dashboard-net 2>/dev/null || true

# 2. Bazy danych
docker run -d --name postgres --network dashboard-net -e POSTGRES_PASSWORD=pass -e POSTGRES_USER=user -e POSTGRES_DB=dashboard -v pg_data:/var/lib/postgresql/data postgres:15-alpine

MSYS_NO_PATHCONV=1 docker run -d --name redis --network dashboard-net --tmpfs /data redis:7-alpine

echo "Czekam na bazy..."
sleep 5

# 3. Backend i Frontend
docker run -d --name backend --network dashboard-net -e DATABASE_URL=postgres://user:pass@postgres:5432/dashboard -e REDIS_URL=redis://redis:6379 localhost:5000/dashboard-backend:latest

docker run -d --name frontend --network dashboard-net -p 8080:80 -v "$(pwd)/frontend/nginx.conf:/etc/nginx/nginx.conf:ro" localhost:5000/dashboard-frontend:latest