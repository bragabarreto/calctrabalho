'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB
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

// Extração de histórico salarial via arquivo (PDF, xlsx, csv, imagem) usando Claude API
router.post('/parse-historico-arquivo', upload.single('arquivo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ erro: 'Arquivo não enviado' });

    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const mime = req.file.mimetype;
    const buffer = req.file.buffer;

    let mensagemContent;
    const promptTexto = 'Analise o documento e extraia o histórico salarial. Retorne SOMENTE um JSON válido com a estrutura: {"resultados": [{"mesAno": "YYYY-MM", "valor": number, "descricao": "nome da rubrica"}]}. Inclua todos os componentes de remuneração encontrados (salário base, adicionais, horas extras etc.). Se múltiplas rubricas, liste cada uma separadamente. Não inclua texto fora do JSON.';

    if (mime === 'application/pdf') {
      // PDF → extrai texto com pdf-parse → envia ao Claude como texto
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      mensagemContent = `${promptTexto}\n\nConteúdo do documento:\n${data.text}`;
    } else if (
      mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mime === 'application/vnd.ms-excel' ||
      mime === 'text/csv' ||
      mime === 'text/plain'
    ) {
      // XLSX/CSV → converte para texto
      const XLSX = require('xlsx');
      const wb = XLSX.read(buffer, { type: 'buffer' });
      let texto = '';
      wb.SheetNames.forEach(sheetName => {
        const ws = wb.Sheets[sheetName];
        texto += `Planilha: ${sheetName}\n${XLSX.utils.sheet_to_csv(ws)}\n`;
      });
      mensagemContent = `${promptTexto}\n\nConteúdo da planilha:\n${texto}`;
    } else if (['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(mime)) {
      // Imagem → envia ao Claude Vision
      const base64 = buffer.toString('base64');
      const mediaType = mime === 'image/jpg' ? 'image/jpeg' : mime;
      mensagemContent = [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
        { type: 'text', text: promptTexto },
      ];
    } else {
      return res.status(400).json({ erro: 'Tipo de arquivo não suportado. Use PDF, Excel, CSV ou imagem.' });
    }

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: mensagemContent }],
    });

    const rawText = response.content[0]?.text || '';
    // Extrair JSON da resposta (pode vir com markdown ```json ... ```)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ erro: 'Não foi possível extrair dados do arquivo', rawText });

    let parsed;
    try { parsed = JSON.parse(jsonMatch[0]); } catch {
      return res.status(422).json({ erro: 'Resposta da IA não é JSON válido', rawText });
    }

    const resultados = (parsed.resultados || []).filter(r => r.mesAno && r.valor > 0);
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

/**
 * Simulador de Acordo Externo
 * Calcula INSS, IR (RRA), INSS patronal e FGTS sobre um acordo trabalhista
 * a partir do valor total, parcelas indenizatórias e período do contrato.
 */
router.post('/simular-acordo-externo', async (req, res, next) => {
  try {
    const { calcularINSS, calcularINSSEmpregador, calcularIR_RRA } = require('../services/calculo/verbas/inss');
    const { round2 } = require('../utils/formatacao');

    const {
      valorAcordo,
      dataAdmissao,
      dataDispensa,
      salario,
      parcelasIndenizatorias = [],
    } = req.body;

    if (!valorAcordo || valorAcordo <= 0) {
      return res.status(400).json({ erro: 'valorAcordo é obrigatório e deve ser positivo' });
    }

    // Total indenizatório
    const totalIndenizatorio = round2(
      parcelasIndenizatorias.reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0)
    );

    // Base salarial = acordoTotal - indenizatório
    const baseSalarial = round2(Math.max(0, valorAcordo - totalIndenizatorio));

    // Período: meses entre admissão e dispensa
    let periodoMeses = 1;
    if (dataAdmissao && dataDispensa) {
      const ini = new Date(dataAdmissao);
      const fim = new Date(dataDispensa);
      periodoMeses = Math.max(1, Math.round((fim - ini) / (1000 * 60 * 60 * 24 * 30)));
    }

    // INSS
    const inssEmpregado = await calcularINSS(baseSalarial);
    const inssEmpregador = calcularINSSEmpregador(baseSalarial);

    // IR (RRA)
    const baseTributavelIR = round2(Math.max(0, baseSalarial - inssEmpregado));
    const ir = calcularIR_RRA(baseTributavelIR, periodoMeses);

    // FGTS (informativo)
    const fgts = round2(baseSalarial * 0.08);

    // Percentuais
    const pctIndenizatorio = valorAcordo > 0 ? round2(totalIndenizatorio / valorAcordo) : 0;
    const pctSalarial = round2(1 - pctIndenizatorio);

    res.json({
      sucesso: true,
      resultado: {
        valorAcordo,
        totalIndenizatorio,
        baseSalarial,
        pctSalarial,
        pctIndenizatorio,
        periodoMeses,
        inssEmpregado,
        inssEmpregador,
        baseTributavelIR,
        ir,
        fgts,
        totalEncargosEmpregado: round2(inssEmpregado + ir.valor),
        totalEncargosEmpregador: round2(inssEmpregador),
        liquidoEmpregado: round2(valorAcordo - inssEmpregado - ir.valor),
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
