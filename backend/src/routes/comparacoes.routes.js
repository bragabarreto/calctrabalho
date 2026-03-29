'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/comparacao.controller');

router.post('/', ctrl.criar);
router.get('/', ctrl.listar);
router.get('/:id', ctrl.obter);

module.exports = router;
