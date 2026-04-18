# Backend
cd backend
docker buildx build --platform linux/amd64,linux/arm64 -t localhost:5000/dashboard-backend:latest --push .

# Frontend (użyj starego kodu React, tylko z nowym Dockerfile)
cd ../frontend
docker buildx build --platform linux/amd64,linux/arm64 -t localhost:5000/dashboard-frontend:latest --push .

# Uruchomienie
cd ..
chmod +x start.sh
./start.sh