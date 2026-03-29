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
      const formulaOJ394 = v.memoria?.formulaOJ394 ? ` [OJ 394: ${v.memoria.formulaOJ394}]` : '';
      const criterio = v.memoria?.criterio ? ` (${v.memoria.criterio})` : '';
      row = row.replace(/\{\{formula\}\}/g, (v.memoria?.formula || '') + criterio + formulaOJ394);
      row = row.replace(/\{\{valorFormatado\}\}/g, formatBRL(v.valor));
      return row;
    }).join('');
  });

  // Arrays: {{#conformidade}}...{{/conformidade}}
  html = html.replace(/\{\{#conformidade\}\}([\s\S]*?)\{\{\/conformidade\}\}/g, (_, bloco) => {
    return (dados.conformidade || []).map((item) => {
      let row = bloco;
      row = row.replace(/\{\{nome\}\}/g, item.nome || '');
      row = row.replace(/\{\{valor\}\}/g, item.valor || '');
      row = row.replace(/\{\{fonte\}\}/g, item.fonte || '');
      row = row.replace(/\{\{vigencia\}\}/g, item.vigencia || '');
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

  // Usa total_liquido salvo no banco; caso não exista (simulações antigas), recalcula
  const total = parseFloat(simulacao.total_liquido) || Math.max(0, subtotal - fgtsDepositado - valorPago);

  const pctHonorarios = parseFloat(simulacao.percentual_honorarios) || 0;

  // Usa valores persistidos no banco (Migration 007); cai de volta ao cálculo local para dados antigos
  const honorarios        = parseFloat(simulacao.honorarios_valor)              || total * pctHonorarios;
  const honorariosPericiais = parseFloat(simulacao.honorarios_periciais_calculado) || 0;
  const custas            = parseFloat(simulacao.custas_valor)                  || 0;
  const totalComHonorarios = parseFloat(simulacao.total_com_honorarios)
                             || Math.max(0, total + honorarios + honorariosPericiais + custas);
  const juros             = parseFloat(simulacao.juros_selic_valor)             || 0;
  const totalDevidoReclamado = parseFloat(simulacao.total_devido_reclamado)
                               || totalComHonorarios + juros;

  // Conformidade Legal — parâmetros legais aplicados
  const conformidade = [
    { nome: 'INSS — Tabela Progressiva', valor: '7,5% a 14%', fonte: 'EC 103/2019 + Portaria Interministerial MPS/MF n\u00BA 6/2025', vigencia: '01/01/2025' },
    { nome: 'INSS — Teto Contribui\u00E7\u00E3o (SC)', valor: 'R$ 8.157,41', fonte: 'Portaria MPS/MF 6/2025', vigencia: '01/01/2025' },
    { nome: 'INSS — Contribui\u00E7\u00E3o M\u00E1xima', valor: 'R$ 908,86', fonte: 'C\u00E1lculo progressivo sobre teto', vigencia: '01/01/2025' },
    { nome: 'Sal\u00E1rio M\u00EDnimo', valor: formatBRL(1518.00), fonte: 'Decreto Federal', vigencia: '01/01/2025' },
    { nome: 'FGTS — Al\u00EDquota', valor: '8%', fonte: 'Lei 8.036/1990 art. 15', vigencia: 'Permanente' },
    { nome: 'Multa Rescis\u00F3ria FGTS', valor: '40% / 20%', fonte: 'Art. 18 \u00A71\u00BA Lei 8.036/1990', vigencia: 'Permanente' },
    { nome: 'Prescri\u00E7\u00E3o Quinquenal', valor: '5 anos', fonte: 'CF art. 7\u00BA XXIX + S\u00FAmula 308 TST', vigencia: 'Permanente' },
    { nome: 'Honor\u00E1rios Advocat\u00EDcios', valor: `${((pctHonorarios || 0.15) * 100).toFixed(0)}%`, fonte: 'Art. 791-A CLT', vigencia: 'Permanente' },
  ];

  // OJ 394 SDI-1 TST — reflexos em cascata
  const dataDispensa = simulacao.data_dispensa ? new Date(simulacao.data_dispensa) : null;
  const DATA_OJ394 = new Date('2023-03-20');
  if (dataDispensa && dataDispensa >= DATA_OJ394) {
    conformidade.push({ nome: 'OJ 394 SDI-1 TST', valor: 'Aplicada — reflexos em cascata', fonte: 'IRR-10169-57.2013.5.05.0024', vigencia: '20/03/2023' });
  } else {
    conformidade.push({ nome: 'OJ 394 SDI-1 TST', valor: 'N\u00E3o aplic\u00E1vel (fato gerador anterior)', fonte: 'IRR-10169-57.2013.5.05.0024', vigencia: '20/03/2023' });
  }

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
    conformidade,
    subtotal: formatBRL(subtotal),
    fgtsDepositado: fgtsDepositado > 0,
    fgtsDepositadoFmt: formatBRL(fgtsDepositado),
    valorPago: valorPago > 0,
    valorPagoFmt: formatBRL(valorPago),
    total: formatBRL(total),
    honorarios: honorarios > 0,
    honorariosFmt: formatBRL(honorarios),
    pctHonorarios: (pctHonorarios * 100).toFixed(0),
    honorariosPericiais: honorariosPericiais > 0,
    honorariosPericiaisFmt: formatBRL(honorariosPericiais),
    custas: custas > 0,
    custasFmt: formatBRL(custas),
    totalComHonorarios: formatBRL(totalComHonorarios),
    juros: juros > 0,
    jurosFmt: formatBRL(juros),
    totalDevidoReclamado: formatBRL(totalDevidoReclamado),
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
