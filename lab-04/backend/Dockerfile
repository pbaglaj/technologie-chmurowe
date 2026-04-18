# Argumenty OCI
ARG VERSION=v2
ARG BUILD_DATE=unknown

# --- ETAP 1: deps ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# --- ETAP 2: test (NOWY) ---
FROM node:20-alpine AS test
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Budowanie zostanie przerwane, jeśli testy nie przejdą
RUN npm test

# --- ETAP 3: production ---
FROM node:20-alpine AS production
WORKDIR /app
ARG VERSION
ARG BUILD_DATE

# Metadane OCI
LABEL org.opencontainers.image.title="Dashboard Backend" \
      org.opencontainers.image.version=$VERSION \
      org.opencontainers.image.created=$BUILD_DATE

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node index.js package.json ./
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "index.js"]