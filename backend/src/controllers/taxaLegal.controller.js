'use strict';

const db = require('../config/database');

async function listar(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT TO_CHAR(mes_ano, 'YYYY-MM') AS mes_ano, valor
       FROM taxa_legal_historico
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
      `INSERT INTO taxa_legal_historico (mes_ano, valor)
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
    await db.query('DELETE FROM taxa_legal_historico WHERE mes_ano = $1', [mesAno + '-01']);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

/**
 * Computa a Taxa Legal mensal = max(0, SELIC_mensal − IPCA_mensal)
 * A partir das tabelas selic_historico (taxa_mensal) e ipca_historico (valor).
 *
 * Também busca dados frescos da API do BACEN para SELIC mensal (série 4390)
 * e IPCA (série 433) antes de computar, garantindo dados atualizados.
 */
async function computar(req, res, next) {
  try {
    const hoje = new Date();
    const anoInicio = hoje.getFullYear() - 10;
    const ini = `01/01/${anoInicio}`;
    const fim = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;

    // Buscar SELIC mensal (série 4390) e IPCA (série 433) em paralelo
    const [respSelic, respIpca] = await Promise.all([
      fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.4390/dados?formato=json&dataInicial=${ini}&dataFinal=${fim}`, { signal: AbortSignal.timeout(15000) }),
      fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=${ini}&dataFinal=${fim}`, { signal: AbortSignal.timeout(15000) }),
    ]);

    const dadosSelic = respSelic.ok ? await respSelic.json() : [];
    const dadosIpca = respIpca.ok ? await respIpca.json() : [];

    // Agrupar por mês
    const selicPorMes = {};
    for (const item of (Array.isArray(dadosSelic) ? dadosSelic : [])) {
      const [, m, a] = item.data.split('/');
      selicPorMes[`${a}-${m}`] = parseFloat(item.valor);
    }

    const ipcaPorMes = {};
    for (const item of (Array.isArray(dadosIpca) ? dadosIpca : [])) {
      const [, m, a] = item.data.split('/');
      ipcaPorMes[`${a}-${m}`] = parseFloat(item.valor);
    }

    // Computar taxa legal para cada mês onde ambos existem
    const mesesComuns = Object.keys(selicPorMes).filter(m => ipcaPorMes[m] !== undefined);
    let atualizados = 0;

    for (const mesAno of mesesComuns) {
      const selicMensal = selicPorMes[mesAno];
      const ipcaMensal = ipcaPorMes[mesAno];
      const taxaLegal = Math.max(0, +(selicMensal - ipcaMensal).toFixed(6));

      await db.query(
        `INSERT INTO taxa_legal_historico (mes_ano, valor)
         VALUES ($1, $2)
         ON CONFLICT (mes_ano) DO UPDATE SET valor = EXCLUDED.valor`,
        [mesAno + '-01', taxaLegal]
      );
      atualizados++;
    }

    // Também atualiza IPCA e SELIC no banco local
    for (const [mesAno, valor] of Object.entries(ipcaPorMes)) {
      await db.query(
        `INSERT INTO ipca_historico (mes_ano, valor) VALUES ($1, $2)
         ON CONFLICT (mes_ano) DO UPDATE SET valor = EXCLUDED.valor`,
        [mesAno + '-01', valor]
      );
    }
    for (const [mesAno, taxaMensal] of Object.entries(selicPorMes)) {
      const taxaAnual = ((1 + taxaMensal / 100) ** 12 - 1) * 100;
      await db.query(
        `INSERT INTO selic_historico (mes_ano, taxa_anual, taxa_mensal) VALUES ($1, $2, $3)
         ON CONFLICT (mes_ano) DO UPDATE SET taxa_anual = EXCLUDED.taxa_anual, taxa_mensal = EXCLUDED.taxa_mensal`,
        [mesAno + '-01', +taxaAnual.toFixed(4), +taxaMensal.toFixed(6)]
      );
    }

    res.json({ ok: true, atualizados, mesesComputados: mesesComuns.length });
  } catch (e) { next(e); }
}

module.exports = { listar, salvar, remover, computar };
