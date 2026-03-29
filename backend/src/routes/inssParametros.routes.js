'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inssParametros.controller');

router.get('/', ctrl.listar);
router.get('/vigencia/:vigenciaInicio', ctrl.listarPorVigencia);
router.get('/data/:data', ctrl.obterPorData);
router.post('/', ctrl.salvarVigencia);
router.delete('/vigencia/:vigenciaInicio', ctrl.removerVigencia);

module.exports = router;
