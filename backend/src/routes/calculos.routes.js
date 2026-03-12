'use strict';

const express = require('express');
const router = express.Router();
const { simular, simularMultiplo } = require('../controllers/calculo.controller');
const { validar, schemaSimular, schemaSimularMultiplo } = require('../middlewares/validacao');
const { calcularPeriodos } = require('../controllers/parcelasPersonalizadas.controller');
const { gerarCartaoPontoVirtual } = require('../services/calculo/verbas/cartaoPontoVirtual');

router.post('/simular', validar(schemaSimular), simular);
router.post('/simular-multiplo', validar(schemaSimularMultiplo), simularMultiplo);

// Períodos aquisitivos de férias e 13º a partir das datas do contrato
router.post('/periodos-aquisitivos', calcularPeriodos);

// Cartão de ponto virtual (apuração de HE por jornada definida)
router.post('/cartao-ponto', (req, res, next) => {
  try {
    const { jornadaDefinida, dataInicio, dataFim, afastamentos, divisorJornada } = req.body;
    const resultado = gerarCartaoPontoVirtual(jornadaDefinida, dataInicio, dataFim, afastamentos, divisorJornada);
    res.json({ sucesso: true, ...resultado });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
