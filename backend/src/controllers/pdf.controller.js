'use strict';

const db = require('../config/database');
const { gerarPDF } = require('../services/pdf/generator');

async function gerarPdf(req, res, next) {
  try {
    const { simulacao_id } = req.params;

    const { rows: simRows } = await db.query('SELECT * FROM simulacoes WHERE id = $1', [simulacao_id]);
    if (!simRows.length) return res.status(404).json({ erro: 'Simulação não encontrada' });

    const { rows: verbas } = await db.query(
      'SELECT * FROM resultado_verbas WHERE simulacao_id = $1 ORDER BY ordem_exibicao',
      [simulacao_id]
    );

    const pdfBuffer = await gerarPDF(simRows[0], verbas);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="calculo-${simulacao_id.slice(0, 8)}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

async function gerarPdfComparacao(req, res, next) {
  try {
    const { comparacao_id } = req.params;

    const { rows } = await db.query('SELECT * FROM comparacoes WHERE id = $1', [comparacao_id]);
    if (!rows.length) return res.status(404).json({ erro: 'Comparação não encontrada' });

    // Para a comparação, gerar um PDF simples com a tabela lado a lado
    // (implementação básica — pode ser expandida)
    res.status(501).json({ erro: 'PDF de comparação em desenvolvimento' });
  } catch (err) {
    next(err);
  }
}

module.exports = { gerarPdf, gerarPdfComparacao };
