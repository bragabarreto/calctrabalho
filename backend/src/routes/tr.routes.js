'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tr.controller');

router.get('/', ctrl.listar);
router.post('/', ctrl.salvar);
router.delete('/:mesAno', ctrl.remover);
router.post('/bacen-sync', ctrl.bacenSync);

module.exports = router;
