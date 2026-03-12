'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');

async function seed() {
  const seedsDir = path.join(__dirname, '..', 'seeds');
  const files = fs.readdirSync(seedsDir).filter(f => f.endsWith('.sql')).sort();

  console.log(`Executando ${files.length} seed(s)...`);

  for (const file of files) {
    const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');
    console.log(`  -> ${file}`);
    await pool.query(sql);
  }

  console.log('Seeds concluídos.');
  await pool.end();
}

seed().catch(err => {
  console.error('Erro nos seeds:', err.message);
  process.exit(1);
});
