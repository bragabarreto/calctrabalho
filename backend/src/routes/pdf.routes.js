'use strict';

const express = require('express');
const router = express.Router();
const { gerarPdf, gerarPdfComparacao } = require('../controllers/pdf.controller');

router.post('/gerar/:simulacao_id', gerarPdf);
router.post('/comparacao/:comparacao_id', gerarPdfComparacao);

module.exports = router;
