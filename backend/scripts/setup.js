'use strict';

/**
 * Setup script para primeiro deploy — roda migrations + seeds.
 * Uso: node backend/scripts/setup.js
 *
 * Seguro para rodar múltiplas vezes (migrations usam IF NOT EXISTS,
 * seeds usam ON CONFLICT DO NOTHING / UPDATE).
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');

async function runSqlFiles(dir, label) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  console.log(`\n${label}: ${files.length} arquivo(s)`);
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    console.log(`  -> ${file}`);
    await pool.query(sql);
  }
}

async function setup() {
  console.log('=== CalcTrabalho — Setup Inicial ===');

  await runSqlFiles(path.join(__dirname, '..', 'migrations'), 'Migrations');
  await runSqlFiles(path.join(__dirname, '..', 'seeds'), 'Seeds');

  console.log('\nSetup concluído com sucesso.');
  await pool.end();
}

setup().catch(err => {
  console.error('Erro no setup:', err.message);
  process.exit(1);
});
