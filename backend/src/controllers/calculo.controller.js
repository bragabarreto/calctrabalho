'use strict';

const { calcular } = require('../services/calculo/engine');

async function simular(req, res, next) {
  try {
    const { dados, modalidade } = req.body;
    const resultado = await calcular(dados, modalidade);
    res.json({ sucesso: true, resultado });
  } catch (err) {
    next(err);
  }
}

const MODALIDADES_TRIPLAS = ['sem_justa_causa', 'pedido_demissao', 'culpa_reciproca'];

async function simularMultiplo(req, res, next) {
  try {
    const { dados } = req.body;
    const calculos = await Promise.all(
      MODALIDADES_TRIPLAS.map((mod) => calcular(dados, mod))
    );
    const resultados = {};
    MODALIDADES_TRIPLAS.forEach((mod, i) => { resultados[mod] = calculos[i]; });
    res.json({ sucesso: true, resultados });
  } catch (err) {
    next(err);
  }
}

module.exports = { simular, simularMultiplo };
