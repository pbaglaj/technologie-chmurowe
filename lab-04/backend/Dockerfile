# Etap 1: Pobranie i instalacja tylko zależności produkcyjnych
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Instalacja paczek bez devDependencies
RUN npm ci --omit=dev

# Etap 2: Obraz produkcyjny
FROM node:20-alpine AS production
WORKDIR /app

# Ustawienie zmiennej środowiskowej środowiska
ENV NODE_ENV=production

# Ustawienie uprawnień dla wbudowanego w obraz node użytkownika 'node'
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .

# Przełączenie na użytkownika bez uprawnień roota
USER node

EXPOSE 3000

# Deklaracja weryfikacji zdrowia kontenera
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "index.js"]