'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const calculosRoutes = require('./routes/calculos.routes');
const simulacoesRoutes = require('./routes/simulacoes.routes');
const comparacoesRoutes = require('./routes/comparacoes.routes');
const pdfRoutes = require('./routes/pdf.routes');
const parcelasRoutes = require('./routes/parcelasPersonalizadas.routes');
const { errorHandler, notFound } = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

const corsOrigin = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((s) => s.trim())
  : true; // allow all origins in dev; set FRONTEND_URL in production
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir PDFs gerados
app.use('/pdfs', express.static(path.join(__dirname, '..', 'pdfs')));

// Em produção: servir o frontend buildado (pasta public copiada pelo Dockerfile)
const frontendDist = path.join(__dirname, '..', 'public');
if (require('fs').existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}

// Rotas da API
app.use('/api/calculos', calculosRoutes);
app.use('/api/simulacoes', simulacoesRoutes);
app.use('/api/comparacoes', comparacoesRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/parcelas-personalizadas', parcelasRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', versao: '1.0.0' }));

// SPA fallback: retorna index.html para rotas não-API (react-router)
if (require('fs').existsSync(frontendDist)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.use(notFound);
}
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`CalcTrabalho API rodando na porta ${PORT}`);
});

module.exports = app;
