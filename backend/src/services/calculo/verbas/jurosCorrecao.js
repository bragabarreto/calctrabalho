'use strict';

const { differenceInDays, toDate, format, addDays } = require('../../../utils/datas');
const { round2 } = require('../../../utils/formatacao');

// ═══════════════════════════════════════════════════════════════════════════════
//  JUROS E CORREÇÃO MONETÁRIA — ADC 58 STF + Lei 14.905/2024
//
//  FASE PRÉ-JUDICIAL (dataEncerramento → véspera ajuizamento):
//    Sub-fase A (período até 30/08/2024):
//      Correção: IPCA-E acumulado (composto)
//      Juros:    TR acumulada (juros simples — soma linear dos % mensais)
//    Sub-fase B (período a partir de 30/08/2024):
//      Correção: IPCA acumulado (composto)
//      Juros:    0 (sem juros)
//    Se todo o período pré-judicial for após 30/08/2024:
//      Correção: IPCA acumulado (composto), Juros: 0
//
//  FASE JUDICIAL (ajuizamento → dataApuracao):
//      Correção: IPCA acumulado (composto)
//      Juros:    Taxa Legal acumulada (composto) = max(0, SELIC − IPCA) por mês
//
//  dataApuracao = último dia do mês em que o cálculo é elaborado.
// ═══════════════════════════════════════════════════════════════════════════════

const DATA_MARCO = '2024-08-30'; // vigência Lei 14.905/2024

/** Retorna 'yyyy-MM-dd' do último dia do mês corrente. */
function ultimoDiaMesAtual() {
  const hoje = new Date();
  const ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return format(ultimo, 'yyyy-MM-dd');
}

/** Conta meses inteiros entre duas datas. */
function contarMesesEntre(d1, d2) {
  const a = toDate(d1), b = toDate(d2);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

// ── Consultas ao banco local ────────────────────────────────────────────────

async function buscarIndicesDoBanco(tabela, dataInicio, dataFim) {
  try {
    const pool = require('../../../config/database');
    const { rows } = await pool.query(
      `SELECT mes_ano, valor FROM ${tabela}
       WHERE mes_ano >= date_trunc('month', $1::date)
         AND mes_ano <= date_trunc('month', $2::date)
       ORDER BY mes_ano`,
      [dataInicio, dataFim]
    );
    return rows.map(r => ({ mesAno: r.mes_ano, valor: parseFloat(r.valor) }));
  } catch { return []; }
}

const buscarIpcaEDoBanco    = (di, df) => buscarIndicesDoBanco('ipca_e_historico', di, df);
const buscarIpcaDoBanco     = (di, df) => buscarIndicesDoBanco('ipca_historico', di, df);
const buscarTRDoBanco       = (di, df) => buscarIndicesDoBanco('tr_historico', di, df);
const buscarTaxaLegalDoBanco = (di, df) => buscarIndicesDoBanco('taxa_legal_historico', di, df);

// ── Busca em tempo real via API BACEN (fallback / atualização) ──────────────

/** Busca IPCA-E via BACEN série 10764, retorna registros mensais. */
async function buscarIpcaEBacen(dataInicio, dataFim) {
  try {
    const ini = format(toDate(dataInicio), 'dd/MM/yyyy');
    const fim = format(toDate(dataFim), 'dd/MM/yyyy');
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.10764/dados?formato=json&dataInicial=${ini}&dataFinal=${fim}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return [];
    const dados = await resp.json();
    if (!Array.isArray(dados)) return [];
    // Agrupar por mês (último valor do mês)
    const porMes = {};
    for (const item of dados) {
      const [, m, a] = item.data.split('/');
      porMes[`${a}-${m}-01`] = parseFloat(item.valor);
    }
    return Object.entries(porMes).map(([mesAno, valor]) => ({ mesAno, valor }));
  } catch { return []; }
}

/** Busca IPCA via BACEN série 433, retorna registros mensais. */
async function buscarIpcaBacen(dataInicio, dataFim) {
  try {
    const ini = format(toDate(dataInicio), 'dd/MM/yyyy');
    const fim = format(toDate(dataFim), 'dd/MM/yyyy');
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=${ini}&dataFinal=${fim}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return [];
    const dados = await resp.json();
    if (!Array.isArray(dados)) return [];
    const porMes = {};
    for (const item of dados) {
      const [, m, a] = item.data.split('/');
      porMes[`${a}-${m}-01`] = parseFloat(item.valor);
    }
    return Object.entries(porMes).map(([mesAno, valor]) => ({ mesAno, valor }));
  } catch { return []; }
}

/** Busca TR via BACEN série 226 (diária), agrega por mês (1º dia). */
async function buscarTRBacen(dataInicio, dataFim) {
  try {
    const ini = format(toDate(dataInicio), 'dd/MM/yyyy');
    const fim = format(toDate(dataFim), 'dd/MM/yyyy');
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.226/dados?formato=json&dataInicial=${ini}&dataFinal=${fim}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return [];
    const dados = await resp.json();
    if (!Array.isArray(dados)) return [];
    const porMes = {};
    for (const item of dados) {
      const [d, m, a] = item.data.split('/');
      const chave = `${a}-${m}-01`;
      if (!porMes[chave] || d === '01') porMes[chave] = parseFloat(item.valor);
    }
    return Object.entries(porMes).map(([mesAno, valor]) => ({ mesAno, valor }));
  } catch { return []; }
}

/** Busca SELIC mensal (série 4390) e IPCA (série 433), computa taxa legal = max(0, SELIC - IPCA). */
async function buscarTaxaLegalBacen(dataInicio, dataFim) {
  try {
    const ini = format(toDate(dataInicio), 'dd/MM/yyyy');
    const fim = format(toDate(dataFim), 'dd/MM/yyyy');
    const [respS, respI] = await Promise.all([
      fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.4390/dados?formato=json&dataInicial=${ini}&dataFinal=${fim}`, { signal: AbortSignal.timeout(10000) }),
      fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=${ini}&dataFinal=${fim}`, { signal: AbortSignal.timeout(10000) }),
    ]);
    const dadosS = respS.ok ? await respS.json() : [];
    const dadosI = respI.ok ? await respI.json() : [];
    if (!Array.isArray(dadosS) || !Array.isArray(dadosI)) return [];

    const selicM = {}, ipcaM = {};
    for (const item of dadosS) { const [, m, a] = item.data.split('/'); selicM[`${a}-${m}-01`] = parseFloat(item.valor); }
    for (const item of dadosI) { const [, m, a] = item.data.split('/'); ipcaM[`${a}-${m}-01`] = parseFloat(item.valor); }

    const result = [];
    for (const chave of Object.keys(selicM)) {
      if (ipcaM[chave] !== undefined) {
        result.push({ mesAno: chave, valor: Math.max(0, +(selicM[chave] - ipcaM[chave]).toFixed(6)) });
      }
    }
    return result;
  } catch { return []; }
}

// ── Funções auxiliares de acumulação ────────────────────────────────────────

/** Acumula fator composto a partir de registros [{valor (%)}]. */
function acumularComposto(registros) {
  let fator = 1;
  for (const r of registros) fator *= (1 + r.valor / 100);
  return fator;
}

/** Acumula juros simples: soma linear dos percentuais mensais. Retorna % total. */
function acumularSimples(registros) {
  let soma = 0;
  for (const r of registros) soma += r.valor;
  return soma; // em %
}

// ── Busca com fallback: banco local → API BACEN → estimativa ────────────────

async function obterIndices(buscarBanco, buscarBacen, di, df, fallbackMensal) {
  let registros = await buscarBanco(di, df);
  let estimado = false;
  if (registros.length === 0) {
    registros = await buscarBacen(di, df);
  }
  if (registros.length === 0 && fallbackMensal !== null) {
    const meses = Math.max(1, contarMesesEntre(di, df));
    registros = Array.from({ length: meses }, (_, i) => ({ valor: fallbackMensal }));
    estimado = true;
  }
  return { registros, estimado };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FUNÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcula juros e correção monetária conforme ADC 58 STF + Lei 14.905/2024.
 *
 * @param {number} baseCalculo
 * @param {string|Date} dataEncerramentoComAviso - fim do contrato + aviso projetado
 * @param {string|Date} dataAjuizamento
 */
async function calcularJurosADC58(baseCalculo, dataEncerramentoComAviso, dataAjuizamento) {
  if (!baseCalculo || baseCalculo <= 0 || !dataAjuizamento || !dataEncerramentoComAviso) {
    return { valor: 0, fator: 1, percentual: 0, fases: [], dataApuracao: ultimoDiaMesAtual(),
      memoria: { motivo: 'Base, data de encerramento ou data de ajuizamento não informada' } };
  }

  const dataApuracao = ultimoDiaMesAtual();
  const dtEncerramento = format(toDate(dataEncerramentoComAviso), 'yyyy-MM-dd');
  const dtAjuizamento  = format(toDate(dataAjuizamento), 'yyyy-MM-dd');
  const dtFimPreJudicial = format(addDays(toDate(dtAjuizamento), -1), 'yyyy-MM-dd');

  const fases = [];
  let fatorCorrecaoTotal = 1;
  let fatorJurosTotal = 1;

  // ── FASE PRÉ-JUDICIAL ──────────────────────────────────────────────────────
  if (dtEncerramento < dtAjuizamento) {
    const temPeriodoAnteMarco = dtEncerramento < DATA_MARCO;
    const temPeriodoPosMarco = dtFimPreJudicial >= DATA_MARCO;

    // ── Sub-fase A: até 29/08/2024 (IPCA-E + TR simples) ──────────────────
    if (temPeriodoAnteMarco) {
      const dtFimA = temPeriodoPosMarco ? '2024-08-29' : dtFimPreJudicial;

      const [ipcaE, tr] = await Promise.all([
        obterIndices(buscarIpcaEDoBanco, buscarIpcaEBacen, dtEncerramento, dtFimA, 0.40),
        obterIndices(buscarTRDoBanco, buscarTRBacen, dtEncerramento, dtFimA, 0.05),
      ]);

      const fatorIpcaE = acumularComposto(ipcaE.registros);
      const pctTR = acumularSimples(tr.registros);
      const fatorTR = 1 + (pctTR / 100); // juros simples: base × (1 + soma%/100)
      const meses = Math.max(0, contarMesesEntre(dtEncerramento, dtFimA) + 1);

      fatorCorrecaoTotal *= fatorIpcaE;
      fatorJurosTotal *= fatorTR;

      fases.push({
        descricao: 'Pré-judicial: IPCA-E (correção) + TR juros simples',
        periodo: `${format(toDate(dtEncerramento), 'dd/MM/yyyy')} a ${format(toDate(dtFimA), 'dd/MM/yyyy')}`,
        meses,
        fatorCorrecao: +fatorIpcaE.toFixed(6),
        pctCorrecao: round2((fatorIpcaE - 1) * 100),
        indiceCorrecao: 'IPCA-E',
        fatorJuros: +fatorTR.toFixed(6),
        pctJuros: round2(pctTR),
        indiceJuros: 'TR (juros simples)',
        fator: +(fatorIpcaE * fatorTR).toFixed(6),
        percentual: round2((fatorIpcaE * fatorTR - 1) * 100),
        estimado: ipcaE.estimado || tr.estimado,
      });
    }

    // ── Sub-fase B: a partir de 30/08/2024 (IPCA, sem juros) ──────────────
    if (temPeriodoPosMarco) {
      const dtInicioB = temPeriodoAnteMarco ? DATA_MARCO : dtEncerramento;

      const ipca = await obterIndices(buscarIpcaDoBanco, buscarIpcaBacen, dtInicioB, dtFimPreJudicial, 0.40);
      const fatorIpca = acumularComposto(ipca.registros);
      const meses = Math.max(0, contarMesesEntre(dtInicioB, dtFimPreJudicial) + 1);

      fatorCorrecaoTotal *= fatorIpca;

      fases.push({
        descricao: 'Pré-judicial pós 30/08/2024: IPCA (correção), sem juros',
        periodo: `${format(toDate(dtInicioB), 'dd/MM/yyyy')} a ${format(toDate(dtFimPreJudicial), 'dd/MM/yyyy')}`,
        meses,
        fatorCorrecao: +fatorIpca.toFixed(6),
        pctCorrecao: round2((fatorIpca - 1) * 100),
        indiceCorrecao: 'IPCA',
        fatorJuros: 1,
        pctJuros: 0,
        indiceJuros: 'Sem juros',
        fator: +fatorIpca.toFixed(6),
        percentual: round2((fatorIpca - 1) * 100),
        estimado: ipca.estimado,
      });
    }
  }

  // ── FASE JUDICIAL (ajuizamento → data apuração): IPCA + Taxa Legal ────────
  if (dataApuracao >= dtAjuizamento) {
    const [ipca, taxaLegal] = await Promise.all([
      obterIndices(buscarIpcaDoBanco, buscarIpcaBacen, dtAjuizamento, dataApuracao, 0.40),
      obterIndices(buscarTaxaLegalDoBanco, buscarTaxaLegalBacen, dtAjuizamento, dataApuracao, 0.50),
    ]);

    const fatorIpca = acumularComposto(ipca.registros);
    const fatorTaxaLegal = acumularComposto(taxaLegal.registros);
    const meses = Math.max(0, contarMesesEntre(dtAjuizamento, dataApuracao) + 1);

    fatorCorrecaoTotal *= fatorIpca;
    fatorJurosTotal *= fatorTaxaLegal;

    fases.push({
      descricao: 'Judicial: IPCA (correção) + Taxa Legal (juros) — Lei 14.905/2024',
      periodo: `${format(toDate(dtAjuizamento), 'dd/MM/yyyy')} a ${format(toDate(dataApuracao), 'dd/MM/yyyy')}`,
      meses,
      fatorCorrecao: +fatorIpca.toFixed(6),
      pctCorrecao: round2((fatorIpca - 1) * 100),
      indiceCorrecao: 'IPCA',
      fatorJuros: +fatorTaxaLegal.toFixed(6),
      pctJuros: round2((fatorTaxaLegal - 1) * 100),
      indiceJuros: 'Taxa Legal (SELIC − IPCA)',
      fator: +(fatorIpca * fatorTaxaLegal).toFixed(6),
      percentual: round2((fatorIpca * fatorTaxaLegal - 1) * 100),
      estimado: ipca.estimado || taxaLegal.estimado,
    });
  }

  // Fallback: sem fases
  if (fases.length === 0) {
    return { valor: 0, fator: 1, percentual: 0, fases: [], dataApuracao,
      memoria: { motivo: 'Período insuficiente para apuração de juros e correção' } };
  }

  const fatorTotal = fatorCorrecaoTotal * fatorJurosTotal;
  const valor = round2(baseCalculo * (fatorTotal - 1));
  const percentualTot = round2((fatorTotal - 1) * 100);
  const estimado = fases.some(f => f.estimado);

  // Separar correção e juros para a memória
  const valorCorrecao = round2(baseCalculo * (fatorCorrecaoTotal - 1));
  const valorJuros = round2(baseCalculo * fatorCorrecaoTotal * (fatorJurosTotal - 1));

  return {
    valor,
    fator: +fatorTotal.toFixed(6),
    percentual: percentualTot,
    fatorCorrecao: +fatorCorrecaoTotal.toFixed(6),
    percentualCorrecao: round2((fatorCorrecaoTotal - 1) * 100),
    valorCorrecao,
    fatorJuros: +fatorJurosTotal.toFixed(6),
    percentualJuros: round2((fatorJurosTotal - 1) * 100),
    valorJuros,
    fases,
    dataApuracao,
    estimado,
    memoria: {
      formula: `Base R$ ${baseCalculo.toFixed(2)} × Correção ${(fatorCorrecaoTotal).toFixed(6)} × Juros ${(fatorJurosTotal).toFixed(6)} = fator ${fatorTotal.toFixed(6)}`,
      detalhamento: `Correção: R$ ${valorCorrecao.toFixed(2)} (${round2((fatorCorrecaoTotal - 1) * 100).toFixed(4)}%) | Juros: R$ ${valorJuros.toFixed(2)} (${round2((fatorJurosTotal - 1) * 100).toFixed(4)}%)`,
      dataApuracao: format(toDate(dataApuracao), 'dd/MM/yyyy'),
      dataEncerramento: format(toDate(dtEncerramento), 'dd/MM/yyyy'),
      periodoTotal: `${format(toDate(dtEncerramento), 'dd/MM/yyyy')} a ${format(toDate(dataApuracao), 'dd/MM/yyyy')}`,
      percentualTotal: `${percentualTot.toFixed(4)}%`,
      aviso: estimado ? 'Parte do cálculo usa estimativa — índices do banco ou API do BACEN indisponíveis.' : undefined,
    },
  };
}

/** Compatibilidade retroativa */
async function calcularJurosSelic(baseCalculo, dataAjuizamento, dataCalculo) {
  return calcularJurosADC58(baseCalculo, dataAjuizamento, dataAjuizamento);
}

module.exports = { calcularJurosADC58, calcularJurosSelic, ultimoDiaMesAtual };
