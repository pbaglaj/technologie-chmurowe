# app/backend/Dockerfile

# Etap budowania
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Instalujemy tylko pakiety produkcyjne
RUN npm ci --omit=dev

# Etap produkcyjny
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY src/ ./src/

EXPOSE 8080
CMD ["node", "src/index.js"]