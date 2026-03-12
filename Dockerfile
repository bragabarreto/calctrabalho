# ─── Stage 1: Build Frontend ─────────────────────────────────────────────────
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# Variável de ambiente opcional para API URL em produção
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ─── Stage 2: Backend + Chrome para Puppeteer ────────────────────────────────
FROM node:20-slim AS production

# Instala Chromium para o Puppeteer (PDF generation)
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-liberation \
  fonts-noto-cjk \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  xdg-utils \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Puppeteer usa o Chromium do sistema (não baixa o próprio)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Backend deps
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Backend source
COPY backend/ ./backend/

# Copia o build do frontend para o backend servir como estático
COPY --from=frontend-builder /app/frontend/dist ./backend/public

EXPOSE 3001

# Script de inicialização: roda migrations e inicia o servidor
CMD ["node", "backend/scripts/start-prod.js"]
