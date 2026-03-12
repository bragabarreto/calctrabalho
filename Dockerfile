# ─── Stage 1: Build Frontend ─────────────────────────────────────────────────
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
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

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

WORKDIR /app

# Backend deps
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Backend source
COPY backend/ ./backend/

# Frontend build copiado para backend servir como estático
COPY --from=frontend-builder /app/frontend/dist ./backend/public

EXPOSE 3001

# Servidor inicia direto — migrations são executadas pelo releaseCommand do Railway
CMD ["node", "backend/src/server.js"]
