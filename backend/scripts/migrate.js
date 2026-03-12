'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');

async function migrate() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  console.log(`Executando ${files.length} migration(s)...`);

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`  -> ${file}`);
    await pool.query(sql);
  }

  console.log('Migrations concluídas.');
  await pool.end();
}

migrate().catch(err => {
  console.error('Erro nas migrations:', err.message);
  process.exit(1);
});
