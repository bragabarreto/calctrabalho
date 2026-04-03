'use strict';

const pool = require('../config/database');

async function listar(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM parcelas_personalizadas WHERE ativo = TRUE ORDER BY nome ASC`
    );
    res.json({ sucesso: true, parcelas: rows });
  } catch (err) {
    next(err);
  }
}

async function obter(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT * FROM parcelas_personalizadas WHERE id = $1 AND ativo = TRUE`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Parcela não encontrada' });
    res.json({ sucesso: true, parcela: rows[0] });
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const d = req.body;
    const { rows } = await pool.query(
      `INSERT INTO parcelas_personalizadas (
        nome, descricao, natureza, periodo_tipo, periodo_inicio, periodo_fim,
        frequencia, tipo_valor, valor_base, percentual_base, percentual_adicional,
        gera_reflexos, reflexos_em, incide_inss, incide_ir, incide_fgts,
        template_id, base_historico_id, grupo_biblioteca
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *`,
      [
        d.nome, d.descricao || null, d.natureza, d.periodoTipo || 'contrato',
        d.periodoInicio || null, d.periodoFim || null,
        d.frequencia, d.tipoValor || 'fixo',
        d.valorBase || null, d.percentualBase || null, d.percentualAdicional || 0,
        d.geraReflexos || false, d.reflexosEm || [],
        d.incideInss || false, d.incideIr || false, d.incideFgts || false,
        d.templateId || null, d.baseHistoricoId || null,
        d.grupoId || d.grupoBiblioteca || null,
      ]
    );
    res.status(201).json({ sucesso: true, parcela: rows[0] });
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const d = req.body;
    const { rows } = await pool.query(
      `UPDATE parcelas_personalizadas SET
        nome=$1, descricao=$2, natureza=$3, periodo_tipo=$4, periodo_inicio=$5, periodo_fim=$6,
        frequencia=$7, tipo_valor=$8, valor_base=$9, percentual_base=$10, percentual_adicional=$11,
        gera_reflexos=$12, reflexos_em=$13, incide_inss=$14, incide_ir=$15, incide_fgts=$16,
        template_id=$17, base_historico_id=$18, grupo_biblioteca=$19, atualizado_em=NOW()
      WHERE id=$20 AND ativo=TRUE RETURNING *`,
      [
        d.nome, d.descricao || null, d.natureza, d.periodoTipo || 'contrato',
        d.periodoInicio || null, d.periodoFim || null,
        d.frequencia, d.tipoValor || 'fixo',
        d.valorBase || null, d.percentualBase || null, d.percentualAdicional || 0,
        d.geraReflexos || false, d.reflexosEm || [],
        d.incideInss || false, d.incideIr || false, d.incideFgts || false,
        d.templateId || null, d.baseHistoricoId || null,
        d.grupoId || d.grupoBiblioteca || null,
        id,
      ]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Parcela não encontrada' });
    res.json({ sucesso: true, parcela: rows[0] });
  } catch (err) {
    next(err);
  }
}

async function excluir(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE parcelas_personalizadas SET ativo=FALSE, atualizado_em=NOW() WHERE id=$1`,
      [id]
    );
    res.json({ sucesso: true });
  } catch (err) {
    next(err);
  }
}

// Retorna períodos aquisitivos de férias e 13º a partir das datas do contrato
async function calcularPeriodos(req, res, next) {
  try {
    const { dataAdmissao, dataDispensa, avisoPrevioTrabalhado } = req.body;
    const { calcularPeriodosAquisitivosFerias, calcularPeriodosDecimoTerceiro } =
      require('../services/calculo/verbas/feriasDetalhadas');

    const periodosFerias = calcularPeriodosAquisitivosFerias(
      dataAdmissao, dataDispensa, avisoPrevioTrabalhado || false
    );
    const periodosDecimoTerceiro = calcularPeriodosDecimoTerceiro(
      dataAdmissao, dataDispensa, avisoPrevioTrabalhado || false
    );

    res.json({ sucesso: true, periodosFerias, periodosDecimoTerceiro });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obter, criar, atualizar, excluir, calcularPeriodos };
