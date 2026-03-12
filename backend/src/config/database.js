'use strict';
require('dotenv').config();
const { Pool } = require('pg');

// Railway fornece DATABASE_URL automaticamente; fallback para DB_URL ou variáveis individuais
const connectionString =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  (process.env.DB_HOST
    ? `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`
    : undefined);

const poolConfig = connectionString
  ? { connectionString, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false }
  : { host: 'localhost', port: 5432, database: 'calctrabalho', user: 'calctrabalho', password: 'calctrabalho123' };

const pool = new Pool({
  ...poolConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Erro inesperado no pool PostgreSQL:', err);
});

module.exports = pool;
