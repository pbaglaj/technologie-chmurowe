# Globalne argumenty budowania
ARG NODE_ENV=production
ARG VERSION=latest
ARG BUILD_DATE=unknown

# --- ETAP 1: Deps (zależności produkcyjne) ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# --- ETAP 2: Test (Uruchomienie testów) ---
FROM node:20-alpine AS test
WORKDIR /app
COPY package*.json ./
# Instalacja wszystkich paczek (w tym devDependencies np. jest, supertest)
RUN npm ci
COPY . .
# Uruchomienie testów - jeśli failują, build zostaje w tym miejscu przerwany!
RUN npm test

# --- ETAP 3: Production (Czysty obraz końcowy) ---
FROM node:20-alpine AS production
WORKDIR /app

# Ponowne wczytanie argumentów wewnątrz etapu produkcyjnego
ARG NODE_ENV
ARG VERSION
ARG BUILD_DATE

ENV NODE_ENV=$NODE_ENV

# Etykiety OCI
LABEL org.opencontainers.image.created=$BUILD_DATE
LABEL org.opencontainers.image.version=$VERSION
LABEL org.opencontainers.image.title="Product Dashboard Backend"

# Kopiujemy TYLKO kod aplikacji (bez testów) i produkcyjne node_modules z etapu `deps`
COPY index.js package.json ./
COPY --from=deps --chown=node:node /app/node_modules ./node_modules

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "index.js"]