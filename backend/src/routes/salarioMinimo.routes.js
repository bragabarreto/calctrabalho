'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/salarioMinimo.controller');

router.get('/', ctrl.listar);
router.get('/vigente', ctrl.vigente);
router.post('/', ctrl.salvar);
router.delete('/:mesAno', ctrl.remover);

module.exports = router;
