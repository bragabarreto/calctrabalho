'use strict';

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

async function criar(req, res, next) {
  try {
    const { nome, descricao, simulacao_ids } = req.body;
    if (!simulacao_ids || simulacao_ids.length < 2 || simulacao_ids.length > 4) {
      return res.status(400).json({ erro: 'Informe entre 2 e 4 simulações para comparar' });
    }

    const id = uuidv4();
    await db.query(
      'INSERT INTO comparacoes (id, nome, descricao, simulacao_ids) VALUES ($1,$2,$3,$4)',
      [id, nome, descricao || null, simulacao_ids]
    );

    res.status(201).json({ sucesso: true, id });
  } catch (err) {
    next(err);
  }
}

async function obter(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM comparacoes WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ erro: 'Comparação não encontrada' });

    const comparacao = rows[0];
    const simulacoes = [];

    for (const simId of comparacao.simulacao_ids) {
      const { rows: simRows } = await db.query('SELECT * FROM simulacoes WHERE id = $1', [simId]);
      if (simRows.length) {
        const { rows: verbas } = await db.query(
          'SELECT * FROM resultado_verbas WHERE simulacao_id = $1 ORDER BY ordem_exibicao',
          [simId]
        );
        simulacoes.push({ ...simRows[0], verbas });
      }
    }

    res.json({ sucesso: true, comparacao, simulacoes });
  } catch (err) {
    next(err);
  }
}

async function listar(req, res, next) {
  try {
    const { rows } = await db.query('SELECT id, nome, descricao, criado_em, simulacao_ids FROM comparacoes ORDER BY criado_em DESC');
    res.json({ sucesso: true, dados: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { criar, obter, listar };
