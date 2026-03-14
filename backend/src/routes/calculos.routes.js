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

// Extração de histórico salarial via parsing de texto (IA textual)
router.post('/parse-historico-salarial', (req, res, next) => {
  try {
    const { texto } = req.body;
    if (!texto || typeof texto !== 'string') {
      return res.status(400).json({ erro: 'Campo "texto" obrigatório' });
    }

    const MESES_MAP = {
      jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
      jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
      janeiro: '01', fevereiro: '02', março: '03', marco: '03', abril: '04',
      maio: '05', junho: '06', julho: '07', agosto: '08', setembro: '09',
      outubro: '10', novembro: '11', dezembro: '12',
    };

    function parseValor(s) {
      // "1.234,56" → 1234.56, "1234.56" → 1234.56
      if (!s) return null;
      const clean = s.trim().replace(/\./g, '').replace(',', '.');
      const v = parseFloat(clean);
      return isNaN(v) ? null : v;
    }

    const resultados = [];
    const vistos = new Set();

    function add(mesAno, valor, fonte) {
      if (!mesAno || !valor || valor <= 0) return;
      const chave = mesAno;
      if (vistos.has(chave)) return;
      vistos.add(chave);
      resultados.push({ mesAno, valor: Math.round(valor * 100) / 100, fonte });
    }

    // Padrão 1: "jan/2023 R$ 3.500,00" ou "Janeiro 2023: 3500,00"
    const pat1 = /\b(jan(?:eiro)?|fev(?:ereiro)?|mar(?:[çc]o)?|abr(?:il)?|mai(?:o)?|jun(?:ho)?|jul(?:ho)?|ago(?:sto)?|set(?:embro)?|out(?:ubro)?|nov(?:embro)?|dez(?:embro)?)[\/\.\-\s]+(\d{4})[^\d]{0,20}?(?:R\$\s*)?([\d.,]{4,12})/gi;
    let m;
    while ((m = pat1.exec(texto)) !== null) {
      const mm = MESES_MAP[m[1].toLowerCase().slice(0, 3)];
      if (!mm) continue;
      const mesAno = `${m[2]}-${mm}`;
      const valor = parseValor(m[3]);
      add(mesAno, valor, 'extraído');
    }

    // Padrão 2: "02/2023: R$ 3.500,00" ou "02/2023 3.500,00"
    const pat2 = /\b(\d{2})\/(\d{4})[^\d]{0,20}?(?:R\$\s*)?([\d.,]{4,12})/g;
    while ((m = pat2.exec(texto)) !== null) {
      const mm = m[1];
      if (parseInt(mm) < 1 || parseInt(mm) > 12) continue;
      const mesAno = `${m[2]}-${mm}`;
      const valor = parseValor(m[3]);
      add(mesAno, valor, 'extraído');
    }

    // Padrão 3: "2023-02 3500.00" ou "2023-02: 3500,00"
    const pat3 = /\b(\d{4})-(\d{2})[^\d]{0,10}([\d.,]{4,12})/g;
    while ((m = pat3.exec(texto)) !== null) {
      const mm = m[2];
      if (parseInt(mm) < 1 || parseInt(mm) > 12) continue;
      const mesAno = `${m[1]}-${mm}`;
      const valor = parseValor(m[3]);
      add(mesAno, valor, 'extraído');
    }

    // Ordena por mesAno
    resultados.sort((a, b) => a.mesAno.localeCompare(b.mesAno));

    res.json({ resultados, total: resultados.length });
  } catch (err) {
    next(err);
  }
});

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
