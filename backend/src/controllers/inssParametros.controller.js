'use strict';

const db = require('../config/database');
const { registrarAlteracao } = require('../utils/auditLog');

/**
 * GET / — Lista todos os parâmetros INSS, agrupados por vigência.
 * Retorna: { vigencias: [{ vigencia_inicio, faixas: [...] }] }
 */
async function listar(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT id, TO_CHAR(vigencia_inicio, 'YYYY-MM-DD') AS vigencia_inicio,
              TO_CHAR(vigencia_fim, 'YYYY-MM-DD') AS vigencia_fim,
              faixa_ordem, limite_superior, aliquota,
              contribuicao_maxima, teto_contribuicao, created_at
       FROM inss_parametros
       ORDER BY vigencia_inicio DESC, faixa_ordem ASC`
    );

    // Agrupa por vigencia_inicio
    const mapa = new Map();
    for (const row of rows) {
      const chave = row.vigencia_inicio;
      if (!mapa.has(chave)) {
        mapa.set(chave, {
          vigencia_inicio: chave,
          vigencia_fim: row.vigencia_fim,
          faixas: [],
        });
      }
      mapa.get(chave).faixas.push({
        id: row.id,
        faixa_ordem: row.faixa_ordem,
        limite_superior: Number(row.limite_superior),
        aliquota: Number(row.aliquota),
        contribuicao_maxima: row.contribuicao_maxima ? Number(row.contribuicao_maxima) : null,
        teto_contribuicao: row.teto_contribuicao ? Number(row.teto_contribuicao) : null,
      });
    }

    res.json({ vigencias: Array.from(mapa.values()) });
  } catch (e) { next(e); }
}

/**
 * GET /vigencia/:vigenciaInicio — Lista faixas de uma vigência específica.
 */
async function listarPorVigencia(req, res, next) {
  try {
    const { vigenciaInicio } = req.params;
    const { rows } = await db.query(
      `SELECT id, TO_CHAR(vigencia_inicio, 'YYYY-MM-DD') AS vigencia_inicio,
              TO_CHAR(vigencia_fim, 'YYYY-MM-DD') AS vigencia_fim,
              faixa_ordem, limite_superior, aliquota,
              contribuicao_maxima, teto_contribuicao
       FROM inss_parametros
       WHERE vigencia_inicio = $1
       ORDER BY faixa_ordem ASC`,
      [vigenciaInicio]
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Nenhuma faixa encontrada para esta vigência' });
    }

    res.json({
      vigencia_inicio: rows[0].vigencia_inicio,
      vigencia_fim: rows[0].vigencia_fim,
      faixas: rows.map(r => ({
        id: r.id,
        faixa_ordem: r.faixa_ordem,
        limite_superior: Number(r.limite_superior),
        aliquota: Number(r.aliquota),
        contribuicao_maxima: r.contribuicao_maxima ? Number(r.contribuicao_maxima) : null,
        teto_contribuicao: r.teto_contribuicao ? Number(r.teto_contribuicao) : null,
      })),
    });
  } catch (e) { next(e); }
}

/**
 * POST / — Salva (upsert) todas as faixas de uma vigência.
 * Body: { vigencia_inicio, vigencia_fim?, faixas: [{ faixa_ordem, limite_superior, aliquota }] }
 *
 * Calcula automaticamente:
 *  - teto_contribuicao = maior limite_superior
 *  - contribuicao_maxima = contribuição progressiva sobre o teto
 */
async function salvarVigencia(req, res, next) {
  try {
    const { vigencia_inicio, vigencia_fim, faixas } = req.body;

    if (!vigencia_inicio || !Array.isArray(faixas) || faixas.length === 0) {
      return res.status(400).json({ erro: 'vigencia_inicio e faixas[] são obrigatórios' });
    }

    // Ordena por faixa_ordem para cálculo progressivo
    const faixasOrdenadas = [...faixas].sort((a, b) => a.faixa_ordem - b.faixa_ordem);

    // Teto = maior limite_superior
    const teto = Math.max(...faixasOrdenadas.map(f => Number(f.limite_superior)));

    // Calcula contribuição máxima (alíquota progressiva sobre o teto)
    let contribMaxima = 0;
    let limiteAnterior = 0;
    for (const faixa of faixasOrdenadas) {
      const limSup = Number(faixa.limite_superior);
      const aliq = Number(faixa.aliquota);
      const base = Math.min(limSup, teto) - limiteAnterior;
      if (base > 0) {
        contribMaxima += base * (aliq / 100);
      }
      limiteAnterior = limSup;
    }
    contribMaxima = Math.round(contribMaxima * 100) / 100;

    // Busca dados anteriores para auditoria
    const { rows: anteriores } = await db.query(
      `SELECT faixa_ordem, limite_superior, aliquota, contribuicao_maxima, teto_contribuicao
       FROM inss_parametros WHERE vigencia_inicio = $1 ORDER BY faixa_ordem`,
      [vigencia_inicio]
    );

    // Remove faixas existentes e insere as novas (estratégia replace)
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM inss_parametros WHERE vigencia_inicio = $1', [vigencia_inicio]);

      for (const faixa of faixasOrdenadas) {
        await client.query(
          `INSERT INTO inss_parametros
             (vigencia_inicio, vigencia_fim, faixa_ordem, limite_superior, aliquota, contribuicao_maxima, teto_contribuicao)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            vigencia_inicio,
            vigencia_fim || null,
            faixa.faixa_ordem,
            Number(faixa.limite_superior),
            Number(faixa.aliquota),
            contribMaxima,
            teto,
          ]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Auditoria
    const acao = anteriores.length > 0 ? 'update' : 'insert';
    await registrarAlteracao(
      'inss_parametros',
      acao,
      anteriores.length > 0 ? { vigencia_inicio, faixas: anteriores } : null,
      { vigencia_inicio, faixas: faixasOrdenadas, contribuicao_maxima: contribMaxima, teto_contribuicao: teto }
    );

    res.json({ ok: true, contribuicao_maxima: contribMaxima, teto_contribuicao: teto });
  } catch (e) { next(e); }
}

/**
 * DELETE /vigencia/:vigenciaInicio — Remove todas as faixas de uma vigência.
 */
async function removerVigencia(req, res, next) {
  try {
    const { vigenciaInicio } = req.params;

    // Busca dados para auditoria antes de remover
    const { rows: anteriores } = await db.query(
      `SELECT faixa_ordem, limite_superior, aliquota
       FROM inss_parametros WHERE vigencia_inicio = $1 ORDER BY faixa_ordem`,
      [vigenciaInicio]
    );

    if (anteriores.length === 0) {
      return res.status(404).json({ erro: 'Nenhuma faixa encontrada para esta vigência' });
    }

    await db.query('DELETE FROM inss_parametros WHERE vigencia_inicio = $1', [vigenciaInicio]);

    await registrarAlteracao(
      'inss_parametros',
      'delete',
      { vigencia_inicio: vigenciaInicio, faixas: anteriores },
      null
    );

    res.json({ ok: true });
  } catch (e) { next(e); }
}

/**
 * GET /data/:data — Retorna as faixas vigentes em uma data específica.
 * Busca a vigência mais recente cuja vigencia_inicio <= data informada.
 */
async function obterPorData(req, res, next) {
  try {
    const { data } = req.params;

    const { rows } = await db.query(
      `SELECT id, TO_CHAR(vigencia_inicio, 'YYYY-MM-DD') AS vigencia_inicio,
              TO_CHAR(vigencia_fim, 'YYYY-MM-DD') AS vigencia_fim,
              faixa_ordem, limite_superior, aliquota,
              contribuicao_maxima, teto_contribuicao
       FROM inss_parametros
       WHERE vigencia_inicio = (
         SELECT MAX(vigencia_inicio)
         FROM inss_parametros
         WHERE vigencia_inicio <= $1
       )
       ORDER BY faixa_ordem ASC`,
      [data]
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Nenhuma tabela INSS vigente para esta data' });
    }

    res.json({
      vigencia_inicio: rows[0].vigencia_inicio,
      vigencia_fim: rows[0].vigencia_fim,
      faixas: rows.map(r => ({
        id: r.id,
        faixa_ordem: r.faixa_ordem,
        limite_superior: Number(r.limite_superior),
        aliquota: Number(r.aliquota),
        contribuicao_maxima: r.contribuicao_maxima ? Number(r.contribuicao_maxima) : null,
        teto_contribuicao: r.teto_contribuicao ? Number(r.teto_contribuicao) : null,
      })),
    });
  } catch (e) { next(e); }
}

module.exports = { listar, listarPorVigencia, salvarVigencia, removerVigencia, obterPorData };
