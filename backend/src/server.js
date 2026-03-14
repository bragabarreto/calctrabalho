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
const salarioMinimoRoutes = require('./routes/salarioMinimo.routes');
const ipcaERoutes = require('./routes/ipcaE.routes');
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
app.use('/api/salario-minimo', salarioMinimoRoutes);
app.use('/api/ipca-e', ipcaERoutes);

// Health check — inclui diagnóstico de DB para facilitar debug no Railway
app.get('/api/health', async (req, res) => {
  const info = {
    status: 'ok',
    versao: '1.0.0',
    db_url_presente: Boolean(process.env.DATABASE_URL),
    node_env: process.env.NODE_ENV || null,
  };
  try {
    const db = require('./config/database');
    await db.query('SELECT 1');
    info.db = 'conectado';
  } catch (e) {
    info.db = 'erro: ' + e.message;
  }
  res.json(info);
});

// SPA fallback: retorna index.html para rotas não-API (react-router)
if (require('fs').existsSync(frontendDist)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.use(notFound);
}
app.use(errorHandler);

async function runMigrationsAtStartup() {
  const pool = require('./config/database');
  const fs = require('fs');
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  console.log(`[migrations] Executando ${files.length} migration(s)...`);
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`[migrations]   -> ${file}`);
    await pool.query(sql);
  }
  console.log('[migrations] Concluídas.');
}

runMigrationsAtStartup()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`CalcTrabalho API rodando na porta ${PORT}`);
      console.log(`NODE_ENV: ${process.env.NODE_ENV || '(não definido)'}`);
      console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'PRESENTE (' + process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@') + ')' : 'AUSENTE'}`);
    });
  })
  .catch(err => {
    console.error('[migrations] ERRO FATAL:', err.message);
    process.exit(1);
  });

module.exports = app;
