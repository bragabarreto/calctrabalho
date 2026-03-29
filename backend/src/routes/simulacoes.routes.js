'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/simulacao.controller');
const { validar, schemaSalvarSimulacao } = require('../middlewares/validacao');

router.post('/', validar(schemaSalvarSimulacao), ctrl.criar);
router.get('/', ctrl.listar);
router.get('/:id', ctrl.obter);
router.delete('/:id', ctrl.excluir);

module.exports = router;
