'use strict';

/**
 * Script de inicialização em produção.
 * Aguarda o banco estar disponível, roda migrations, depois inicia o servidor.
 */

require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');

const MAX_TENTATIVAS = 20;
const INTERVALO_MS = 3000;

async function aguardarBanco() {
  const pool = require('../src/config/database');
  for (let i = 1; i <= MAX_TENTATIVAS; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('✓ Banco de dados disponível.');
      return pool;
    } catch (err) {
      console.log(`Aguardando banco... tentativa ${i}/${MAX_TENTATIVAS} (${err.message})`);
      await new Promise((r) => setTimeout(r, INTERVALO_MS));
    }
  }
  throw new Error('Banco de dados indisponível após múltiplas tentativas. Abortando.');
}

async function rodarMigrations() {
  console.log('Rodando migrations...');
  try {
    execSync('node scripts/migrate.js', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
    console.log('✓ Migrations concluídas.');
  } catch (err) {
    console.error('Erro nas migrations:', err.message);
    process.exit(1);
  }
}

async function main() {
  await aguardarBanco();
  await rodarMigrations();

  console.log('Iniciando servidor...');
  require('../src/server');
}

main().catch((err) => {
  console.error('Falha na inicialização:', err.message);
  process.exit(1);
});
