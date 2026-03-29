'use strict';

const { differenceInDays, toDate, format } = require('../../../utils/datas');
const { round2 } = require('../../../utils/formatacao');

/**
 * Busca a taxa SELIC acumulada entre duas datas via API do BACEN.
 * Endpoint: https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados
 * Série 11 = Meta SELIC diária
 */
async function buscarSelicAcumulada(dataInicio, dataFim) {
  try {
    const ini = format(toDate(dataInicio), 'dd/MM/yyyy');
    const fim = format(toDate(dataFim), 'dd/MM/yyyy');
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json&dataInicial=${ini}&dataFinal=${fim}`;

    // Node.js 18+ tem fetch nativo
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) throw new Error('BACEN API retornou ' + resp.status);
    const dados = await resp.json();

    if (!Array.isArray(dados) || dados.length === 0) return null;

    // Cada registro: { data: "DD/MM/YYYY", valor: "X.XXXX" } — taxa diária em % a.a.
    // Acumula: produtório de (1 + taxa_diaria/100)
    let fator = 1;
    for (const item of dados) {
      const taxaDiaria = parseFloat(item.valor) / 100;
      fator *= (1 + taxaDiaria);
    }

    return {
      fatorAcumulado: fator,
      percentualAcumulado: round2((fator - 1) * 100),
      diasUteis: dados.length,
    };
  } catch (err) {
    // Falha silenciosa — retorna null e o cálculo prossegue sem juros
    return null;
  }
}

/**
 * Calcula juros de mora (SELIC) sobre o total da condenação.
 *
 * @param {number} baseCalculo - Valor total sobre o qual incidem os juros
 * @param {string} dataAjuizamento - Data da propositura da ação
 * @param {string} dataCalculo - Data base do cálculo (hoje)
 * @returns {Object} { valor, fator, percentual, diasUteis, memoria }
 */
async function calcularJurosSelic(baseCalculo, dataAjuizamento, dataCalculo) {
  if (!baseCalculo || baseCalculo <= 0 || !dataAjuizamento) {
    return { valor: 0, fator: 1, percentual: 0, diasUteis: 0, memoria: { motivo: 'Base ou data de ajuizamento não informada' } };
  }

  const dataFim = dataCalculo || format(new Date(), 'yyyy-MM-dd');
  const diasTotal = differenceInDays(toDate(dataFim), toDate(dataAjuizamento));

  if (diasTotal <= 0) {
    return { valor: 0, fator: 1, percentual: 0, diasUteis: 0, memoria: { motivo: 'Data de ajuizamento posterior à data do cálculo' } };
  }

  const selic = await buscarSelicAcumulada(dataAjuizamento, dataFim);

  if (!selic) {
    // Fallback: usa estimativa baseada na taxa vigente (15% a.a. = aprox 0.0596% a.d.)
    const taxaDiariaEstimada = 0.15 / 252; // 252 dias úteis por ano
    const fatorEstimado = Math.pow(1 + taxaDiariaEstimada, diasTotal);
    const valorEstimado = round2(baseCalculo * (fatorEstimado - 1));
    return {
      valor: valorEstimado,
      fator: round2(fatorEstimado),
      percentual: round2((fatorEstimado - 1) * 100),
      diasUteis: diasTotal,
      estimado: true,
      memoria: {
        formula: `Base R$ ${baseCalculo.toFixed(2)} × SELIC estimada ${round2((fatorEstimado - 1) * 100).toFixed(4)}% (${diasTotal} dias — API BACEN indisponível)`,
        aviso: 'Valor estimado — API do BACEN indisponível. Use a calculadora oficial do BACEN para apuração exata.',
      },
    };
  }

  const valor = round2(baseCalculo * (selic.fatorAcumulado - 1));

  return {
    valor,
    fator: round2(selic.fatorAcumulado),
    percentual: selic.percentualAcumulado,
    diasUteis: selic.diasUteis,
    estimado: false,
    memoria: {
      formula: `Base R$ ${baseCalculo.toFixed(2)} × (fator SELIC ${selic.fatorAcumulado.toFixed(6)} − 1) = R$ ${valor.toFixed(2)}`,
      periodoCalculado: `${format(toDate(dataAjuizamento), 'dd/MM/yyyy')} a ${format(toDate(dataFim), 'dd/MM/yyyy')}`,
      diasUteisConsiderados: selic.diasUteis,
      percentualAcumulado: `${selic.percentualAcumulado.toFixed(4)}%`,
    },
  };
}

module.exports = { calcularJurosSelic };
