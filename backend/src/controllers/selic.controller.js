'use strict';

const db = require('../config/database');
const { registrarAlteracao } = require('../utils/auditLog');

async function listar(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT TO_CHAR(mes_ano, 'YYYY-MM') AS mes_ano, taxa_anual, taxa_mensal
       FROM selic_historico
       ORDER BY mes_ano DESC
       LIMIT 600`
    );
    res.json({ valores: rows });
  } catch (e) { next(e); }
}

async function salvar(req, res, next) {
  try {
    const { mes_ano, taxa_anual, taxa_mensal } = req.body;
    if (!mes_ano || taxa_anual === undefined || taxa_mensal === undefined) {
      return res.status(400).json({ erro: 'mes_ano, taxa_anual e taxa_mensal obrigatórios' });
    }
    const data = mes_ano + '-01';

    // Buscar valor anterior para auditoria
    const { rows: anteriores } = await db.query(
      'SELECT taxa_anual, taxa_mensal FROM selic_historico WHERE mes_ano = $1',
      [data]
    );

    await db.query(
      `INSERT INTO selic_historico (mes_ano, taxa_anual, taxa_mensal)
       VALUES ($1, $2, $3)
       ON CONFLICT (mes_ano) DO UPDATE SET taxa_anual = EXCLUDED.taxa_anual, taxa_mensal = EXCLUDED.taxa_mensal`,
      [data, Number(taxa_anual), Number(taxa_mensal)]
    );

    await registrarAlteracao(
      'selic_historico',
      anteriores.length ? 'update' : 'insert',
      anteriores.length ? anteriores[0] : null,
      { mes_ano: data, taxa_anual: Number(taxa_anual), taxa_mensal: Number(taxa_mensal) }
    );

    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function remover(req, res, next) {
  try {
    const { mesAno } = req.params;
    const data = mesAno + '-01';

    // Buscar valor anterior para auditoria
    const { rows: anteriores } = await db.query(
      'SELECT taxa_anual, taxa_mensal FROM selic_historico WHERE mes_ano = $1',
      [data]
    );

    await db.query('DELETE FROM selic_historico WHERE mes_ano = $1', [data]);

    if (anteriores.length) {
      await registrarAlteracao('selic_historico', 'delete', anteriores[0], null);
    }

    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function bacenSync(req, res, next) {
  try {
    // Busca taxa Selic mensal do BACEN (série 4390)
    const hoje = new Date();
    const anoInicio = hoje.getFullYear() - 7;
    const ini = `01/01/${anoInicio}`;
    const fim = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.4390/dados?formato=json&dataInicial=${ini}&dataFinal=${fim}`;

    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) throw new Error('BACEN retornou ' + resp.status);
    const dados = await resp.json();
    if (!Array.isArray(dados) || dados.length === 0) {
      return res.json({ ok: true, atualizados: 0, aviso: 'Nenhum dado retornado pelo BACEN' });
    }

    // Cada item: { data: "DD/MM/YYYY", valor: "0.XX" }
    // Agrupa por mês (usa o último valor do mês)
    const porMes = {};
    for (const item of dados) {
      const [d, m, a] = item.data.split('/');
      const chave = `${a}-${m}`;
      porMes[chave] = parseFloat(item.valor);
    }

    let atualizados = 0;
    for (const [mesAno, taxaMensal] of Object.entries(porMes)) {
      // Aproximar taxa anual: (1 + mensal/100)^12 - 1, em %
      const taxaAnual = ((1 + taxaMensal / 100) ** 12 - 1) * 100;

      await db.query(
        `INSERT INTO selic_historico (mes_ano, taxa_anual, taxa_mensal)
         VALUES ($1, $2, $3)
         ON CONFLICT (mes_ano) DO UPDATE SET taxa_anual = EXCLUDED.taxa_anual, taxa_mensal = EXCLUDED.taxa_mensal`,
        [mesAno + '-01', Number(taxaAnual.toFixed(4)), Number(taxaMensal.toFixed(6))]
      );
      atualizados++;
    }

    res.json({ ok: true, atualizados });
  } catch (e) { next(e); }
}

module.exports = { listar, salvar, remover, bacenSync };
