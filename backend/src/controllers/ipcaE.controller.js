'use strict';

const db = require('../config/database');

async function listar(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT TO_CHAR(mes_ano, 'YYYY-MM') AS mes_ano, valor
       FROM ipca_e_historico
       ORDER BY mes_ano DESC
       LIMIT 600`
    );
    res.json({ valores: rows });
  } catch (e) { next(e); }
}

async function salvar(req, res, next) {
  try {
    const { mes_ano, valor } = req.body;
    if (!mes_ano || valor === undefined) return res.status(400).json({ erro: 'mes_ano e valor obrigatórios' });
    const data = mes_ano + '-01';
    await db.query(
      `INSERT INTO ipca_e_historico (mes_ano, valor)
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
    await db.query('DELETE FROM ipca_e_historico WHERE mes_ano = $1', [mesAno + '-01']);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function bacenSync(req, res, next) {
  try {
    // Busca últimos 7 anos do IPCA-E (série BACEN 10764) e upserts no banco
    const hoje = new Date();
    const anoInicio = hoje.getFullYear() - 7;
    const ini = `01/01/${anoInicio}`;
    const fim = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.10764/dados?formato=json&dataInicial=${ini}&dataFinal=${fim}`;

    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) throw new Error('BACEN retornou ' + resp.status);
    const dados = await resp.json();
    if (!Array.isArray(dados) || dados.length === 0) {
      return res.json({ ok: true, atualizados: 0, aviso: 'Nenhum dado retornado pelo BACEN' });
    }

    // Cada item: { data: "DD/MM/YYYY", valor: "X.XXXX" }
    // Agrupa por mês (usa o último valor do mês como o valor mensal)
    const porMes = {};
    for (const item of dados) {
      const [d, m, a] = item.data.split('/');
      const chave = `${a}-${m}`;
      porMes[chave] = parseFloat(item.valor);
    }

    let atualizados = 0;
    for (const [mesAno, valor] of Object.entries(porMes)) {
      await db.query(
        `INSERT INTO ipca_e_historico (mes_ano, valor)
         VALUES ($1, $2)
         ON CONFLICT (mes_ano) DO UPDATE SET valor = EXCLUDED.valor`,
        [mesAno + '-01', valor]
      );
      atualizados++;
    }

    res.json({ ok: true, atualizados });
  } catch (e) { next(e); }
}

module.exports = { listar, salvar, remover, bacenSync };
