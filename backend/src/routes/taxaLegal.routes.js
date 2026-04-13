'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/taxaLegal.controller');

router.get('/', ctrl.listar);
router.post('/', ctrl.salvar);
router.delete('/:mesAno', ctrl.remover);
router.post('/computar', ctrl.computar);  // Computa a partir de SELIC - IPCA + sincroniza com BACEN

module.exports = router;
