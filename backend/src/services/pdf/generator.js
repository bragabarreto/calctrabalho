'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

function formatBRL(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

function formatData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

const MODALIDADE_LABELS = {
  sem_justa_causa: 'Dispensa sem Justa Causa',
  pedido_demissao: 'Pedido de Demissão',
  culpa_reciproca: 'Culpa Recíproca',
  rescisao_indireta: 'Rescisão Indireta',
  justa_causa: 'Dispensa por Justa Causa',
};

/**
 * Renderiza o template HTML substituindo variáveis simples e arrays
 */
function renderTemplate(template, dados) {
  let html = template;

  // Arrays: {{#verbas}}...{{/verbas}}
  html = html.replace(/\{\{#verbas\}\}([\s\S]*?)\{\{\/verbas\}\}/g, (_, bloco) => {
    return (dados.verbas || []).map((v) => {
      let row = bloco;
      // {{#if valor}} ... {{/if}}
      const temValor = v.valor > 0;
      row = row.replace(/\{\{#if valor\}\}([\s\S]*?)\{\{\/if\}\}/g, temValor ? '$1' : '');
      row = row.replace(/\{\{nome\}\}/g, v.nome || '');
      row = row.replace(/\{\{natureza\}\}/g, v.natureza || '');
      row = row.replace(/\{\{incideFgts\}\}/g, v.incideFgts ? '✓' : '—');
      row = row.replace(/\{\{incideInss\}\}/g, v.incideInss ? '✓' : '—');
      row = row.replace(/\{\{formula\}\}/g, v.memoria?.formula || '');
      row = row.replace(/\{\{valorFormatado\}\}/g, formatBRL(v.valor));
      return row;
    }).join('');
  });

  // Condicionais simples {{#if x}}...{{/if}}
  for (const [key, val] of Object.entries(dados)) {
    const regex = new RegExp(`\\{\\{#if ${key}\\}\\}([\\s\\S]*?)\\{\\{\\/if\\}\\}`, 'g');
    html = html.replace(regex, val ? '$1' : '');
  }

  // Variáveis escalares
  for (const [key, val] of Object.entries(dados)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val !== undefined ? String(val) : '');
  }

  return html;
}

/**
 * Gera PDF a partir dos dados de uma simulação e seu resultado
 */
async function gerarPDF(simulacao, verbas) {
  const templatePath = path.join(__dirname, 'templates', 'memoriaCalculo.html');
  const template = fs.readFileSync(templatePath, 'utf8');

  const verbasFormatadas = verbas
    .filter((v) => v.valor_considerado && parseFloat(v.valor_bruto) > 0)
    .map((v) => ({
      nome: v.nome,
      natureza: v.natureza,
      incideFgts: v.incide_fgts,
      incideInss: v.incide_inss,
      valor: parseFloat(v.valor_bruto),
      memoria: v.memoria_calculo || {},
    }));

  const subtotal = verbasFormatadas.reduce((a, v) => a + v.valor, 0);
  const fgtsDepositado = parseFloat(simulacao.fgts_depositado) || 0;
  const valorPago = parseFloat(simulacao.valor_pago) || 0;
  const total = Math.max(0, subtotal - fgtsDepositado - valorPago);
  const pctHonorarios = parseFloat(simulacao.percentual_honorarios) || 0;
  const honorarios = total * pctHonorarios;
  const totalComHonorarios = total + honorarios;

  const dados = {
    nome: simulacao.nome,
    processo: simulacao.numero_processo || '—',
    dataGeracao: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    dataAdmissao: formatData(simulacao.data_admissao),
    dataDispensa: formatData(simulacao.data_dispensa),
    dataAjuizamento: formatData(simulacao.data_ajuizamento),
    modalidade: MODALIDADE_LABELS[simulacao.modalidade] || simulacao.modalidade,
    ultimoSalario: formatBRL(simulacao.ultimo_salario),
    avisoPrevio: simulacao.aviso_previo_trabalhado ? 'Trabalhado' : 'Indenizado',
    marcoPrescricional: '—',
    lapsoComAvisoMeses: '—',
    lapsoSemAvisoMeses: '—',
    diasUteis6d: '—',
    diasUteis5d: '—',
    verbas: verbasFormatadas,
    subtotal: formatBRL(subtotal),
    fgtsDepositado: fgtsDepositado > 0,
    fgtsDepositadoFmt: formatBRL(fgtsDepositado),
    valorPago: valorPago > 0,
    valorPagoFmt: formatBRL(valorPago),
    total: formatBRL(total),
    honorarios: honorarios > 0,
    honorariosFmt: formatBRL(honorarios),
    pctHonorarios: (pctHonorarios * 100).toFixed(0),
    totalComHonorarios: formatBRL(totalComHonorarios),
  };

  const html = renderTemplate(template, dados);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' },
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

module.exports = { gerarPDF };
