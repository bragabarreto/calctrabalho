'use strict';

const db = require('../config/database');

async function listar(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT TO_CHAR(mes_ano, 'YYYY-MM') AS mes_ano, valor
       FROM salario_minimo_historico
       ORDER BY mes_ano DESC
       LIMIT 500`
    );
    res.json({ valores: rows });
  } catch (e) { next(e); }
}

async function vigente(req, res, next) {
  try {
    const data = req.query.data; // YYYY-MM-DD opcional — SM em vigor nessa data
    const refExpr = data ? `$1::date` : `NOW()`;
    const params = data ? [data] : [];
    const { rows } = await db.query(
      `SELECT TO_CHAR(mes_ano, 'YYYY-MM') AS mes_ano, valor
       FROM salario_minimo_historico
       WHERE mes_ano <= DATE_TRUNC('month', ${refExpr})
       ORDER BY mes_ano DESC
       LIMIT 1`,
      params
    );
    res.json({ valor: rows[0]?.valor || 0, mes_ano: rows[0]?.mes_ano || null });
  } catch (e) { next(e); }
}

async function salvar(req, res, next) {
  try {
    const { mes_ano, valor } = req.body;
    if (!mes_ano || !valor) return res.status(400).json({ erro: 'mes_ano e valor obrigatórios' });
    const data = mes_ano + '-01';
    await db.query(
      `INSERT INTO salario_minimo_historico (mes_ano, valor)
       VALUES ($1, $2)
       ON CONFLICT (mes_ano) DO UPDATE SET valor = EXCLUDED.valor`,
      [data, Number(valor)]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function remover(req, res, next) {
  try {
    const { mesAno } = req.params;
    await db.query('DELETE FROM salario_minimo_historico WHERE mes_ano = $1', [mesAno + '-01']);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

// Retorna faixas de salário mínimo entre duas datas (para geração automática de histórico)
async function faixas(req, res, next) {
  try {
    const { inicio, fim } = req.query;
    if (!inicio || !fim) return res.status(400).json({ erro: 'Parâmetros inicio e fim obrigatórios (YYYY-MM-DD)' });
    const { rows } = await db.query(
      `SELECT TO_CHAR(mes_ano, 'YYYY-MM') AS "mesAno", valor
       FROM salario_minimo_historico
       WHERE mes_ano >= DATE_TRUNC('month', $1::date)
         AND mes_ano <= DATE_TRUNC('month', $2::date)
       ORDER BY mes_ano ASC`,
      [inicio, fim]
    );
    res.json({ faixas: rows });
  } catch (e) { next(e); }
}

module.exports = { listar, vigente, salvar, remover, faixas };
