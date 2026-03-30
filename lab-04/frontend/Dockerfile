# Etap 1: Zależności (w tym devDependencies potrzebne do budowy)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Etap 2: Budowanie aplikacji (React/Vite)
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Etap 3: Lekki serwer Nginx z konfiguracją dla użytkownika non-root
FROM nginx:alpine AS production

# Kopiowanie zbudowanej statycznej aplikacji i pliku konfiguracyjnego
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

# Rekonfiguracja Nginx do pracy w trybie non-root:
# - nadanie praw użytkownikowi nginx do katalogów systemowych Nginx
# - zmiana nasłuchiwanego portu z 80 na 8080 (nie-root nie otworzy portu <= 1024)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid && \
    sed -i 's/listen 80;/listen 8080;/g' /etc/nginx/nginx.conf

# Przełączenie na standardowego (istniejącego w alpine) użytkownika nginx
USER nginx

# Otwarcie portu wysokiego dla non-roota
EXPOSE 8080

# Weryfikacja zdrowia przez frontend Nginx (który rozwiąże stronę index.html)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]