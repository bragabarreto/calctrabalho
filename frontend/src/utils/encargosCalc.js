/**
 * Cálculos de INSS e IR para recálculo dinâmico no frontend.
 * Espelha a lógica do backend (inss.js / constants.js) usando as tabelas
 * retornadas no response do cálculo.
 */

// Tabelas padrão 2025 (fallback se o backend não enviar as tabelas)
const INSS_TABELA_DEFAULT = [
  { ate: 1518.00, aliquota: 0.075 },
  { ate: 2793.88, aliquota: 0.09 },
  { ate: 4190.83, aliquota: 0.12 },
  { ate: 8157.41, aliquota: 0.14 },
];
const INSS_CONTRIB_MAX_DEFAULT = 908.86;

const IR_TABELA_DEFAULT = [
  { ate: 2259.20, aliquota: 0, deducao: 0 },
  { ate: 2826.65, aliquota: 0.075, deducao: 169.44 },
  { ate: 3751.05, aliquota: 0.15, deducao: 381.44 },
  { ate: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { ate: Infinity, aliquota: 0.275, deducao: 896.00 },
];

function round2(v) {
  return Math.round(v * 100) / 100;
}

/**
 * INSS empregado — tabela progressiva.
 * @param {number} salarioBruto - base de incidência INSS
 * @param {Array} [tabela] - faixas INSS (opcional, fallback para 2025)
 * @param {number} [contribMax] - contribuição máxima (opcional)
 * @returns {number}
 */
export function calcINSSProgressivo(salarioBruto, tabela, contribMax) {
  const faixas = tabela || INSS_TABELA_DEFAULT;
  const teto = contribMax || INSS_CONTRIB_MAX_DEFAULT;
  let inss = 0;
  let baseAnterior = 0;

  for (const faixa of faixas) {
    if (salarioBruto <= baseAnterior) break;
    const baseNaFaixa = Math.min(salarioBruto, faixa.ate) - baseAnterior;
    if (baseNaFaixa > 0) inss += baseNaFaixa * faixa.aliquota;
    baseAnterior = faixa.ate;
    if (salarioBruto <= faixa.ate) break;
  }

  return round2(Math.min(inss, teto));
}

/**
 * IR pelo método RRA (art. 12-A Lei 7.713/88).
 * @param {number} baseCalculo - total tributável (após INSS)
 * @param {number} mesesReferencia - meses do contrato
 * @param {Array} [tabela] - tabela IR (opcional, fallback para 2025)
 * @returns {{ valor: number, aliquotaEfetiva: number, memoria: Object }}
 */
export function calcIR_RRA(baseCalculo, mesesReferencia, tabela) {
  const irTabela = tabela || IR_TABELA_DEFAULT;
  if (!baseCalculo || baseCalculo <= 0) return { valor: 0, aliquotaEfetiva: 0, memoria: { motivo: 'Sem base tributável' } };

  const meses = Math.max(1, mesesReferencia || 1);
  const rendimentoMensal = baseCalculo / meses;

  let faixa = irTabela.find(f => rendimentoMensal <= f.ate);
  if (!faixa) faixa = irTabela[irTabela.length - 1];

  const irMensal = rendimentoMensal * faixa.aliquota - faixa.deducao;
  const irTotal = round2(Math.max(0, irMensal) * meses);
  const aliquotaEfetiva = baseCalculo > 0 ? round2((irTotal / baseCalculo) * 100) : 0;

  return {
    valor: irTotal,
    aliquotaEfetiva,
    memoria: {
      formula: `Base RRA: R$ ${baseCalculo.toFixed(2)} ÷ ${meses} meses = R$ ${rendimentoMensal.toFixed(2)}/mês → alíquota ${(faixa.aliquota * 100).toFixed(1)}% → IR mensal R$ ${Math.max(0, irMensal).toFixed(2)} × ${meses} = R$ ${irTotal.toFixed(2)}`,
      rendimentoMensal: round2(rendimentoMensal),
      mesesReferencia: meses,
      aliquota: faixa.aliquota,
    },
  };
}

/**
 * Recalcula todos os encargos (INSS empregado/empregador, IR) a partir das verbas atuais.
 * @param {Array} verbas - lista de verbas (com flags incideInss, natureza, excluida)
 * @param {number} lapsoMeses - meses do contrato (para RRA)
 * @param {Object} [tabelas] - { inss: { faixas, contribuicaoMaxima }, ir: faixas } do backend
 * @returns {Object} encargos no mesmo formato do backend
 */
export function recalcularEncargos(verbas, lapsoMeses, tabelas) {
  const inssTabela = tabelas?.inss?.faixas || INSS_TABELA_DEFAULT;
  const inssMax = tabelas?.inss?.contribuicaoMaxima || INSS_CONTRIB_MAX_DEFAULT;
  const irTabela = tabelas?.ir || IR_TABELA_DEFAULT;

  const ativas = (verbas || []).filter(v => !v.excluida);

  const baseInss = round2(ativas.filter(v => v.incideInss).reduce((acc, v) => acc + v.valor, 0));
  const subtotal = round2(ativas.reduce((acc, v) => acc + v.valor, 0));
  const baseSalarial = round2(ativas.filter(v => v.natureza === 'salarial').reduce((acc, v) => acc + v.valor, 0));
  const baseIndenizatoria = round2(subtotal - baseSalarial);
  const pctSalarial = subtotal > 0 ? round2(baseSalarial / subtotal) : 0;
  const pctIndenizatorio = round2(1 - pctSalarial);

  const inssEmpregado = calcINSSProgressivo(baseInss, inssTabela, inssMax);
  const inssEmpregador = round2(baseInss * 0.20);

  const baseTributavel = round2(Math.max(0, baseInss - inssEmpregado));
  const irRetido = calcIR_RRA(baseTributavel, lapsoMeses, irTabela);

  return {
    baseInss,
    baseSalarial,
    baseIndenizatoria,
    pctSalarial,
    pctIndenizatorio,
    inssEmpregado,
    inssEmpregador,
    baseTributavel,
    irRetido,
    memoria: {
      baseInss: `R$ ${baseInss.toFixed(2)} (verbas com incidência INSS, não excluídas)`,
      inssEmpregado: `R$ ${inssEmpregado.toFixed(2)} (tabela progressiva)`,
      inssEmpregador: `R$ ${inssEmpregador.toFixed(2)} (20% patronal — art. 22 Lei 8.212/91)`,
      baseTributavel: `R$ ${baseTributavel.toFixed(2)} (base INSS − INSS empregado)`,
      aviso: 'Valores informativos — o IR em reclamações trabalhistas segue o método RRA (art. 12-A da Lei 7.713/88). Confirme com o perito contábil.',
    },
  };
}
