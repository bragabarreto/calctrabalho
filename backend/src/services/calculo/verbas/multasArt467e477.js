'use strict';

const { round2 } = require('../../../utils/formatacao');
const { addDays, toDate, format } = require('../../../utils/datas');
const { calcularRemuneracaoMensal } = require('../../../utils/baseRescisoria');

/**
 * Multa art. 467 CLT
 * Salários incontestáveis não pagos até a primeira audiência (dissídio)
 * = 1 mensalidade se pagamento > dispensa + 10 dias OU sem pagamento
 * Base: remuneração mensal completa (art. 457 §1º CLT)
 */
function calcularMultaArt467(dados, temporal) {
  if (dados.verbasExcluidas?.includes('multa_art_467')) {
    return { valor: 0, excluida: true, memoria: { motivo: 'Excluída do cálculo' } };
  }

  const base = calcularRemuneracaoMensal(dados);
  const dispensa = temporal.dataDispensa;
  const pgto = dados.dataPgtoRescisorio ? toDate(dados.dataPgtoRescisorio) : null;
  const prazo = addDays(dispensa, 10);

  if (!pgto || pgto > prazo) {
    const valor = round2(base);
    return {
      valor,
      excluida: false,
      memoria: {
        formula: `Pagamento não efetuado ou efetuado após ${format(prazo, 'dd/MM/yyyy')} — art. 467 CLT = R$ ${valor.toFixed(2)}`,
        base,
        prazo: format(prazo, 'dd/MM/yyyy'),
      },
    };
  }

  return { valor: 0, excluida: false, memoria: { motivo: 'Pagamento efetuado no prazo — multa art. 467 não devida' } };
}

/**
 * Multa art. 477 §8º CLT
 * Atraso no pagamento das verbas rescisórias (prazo: 10 dias após dispensa)
 * = 1 remuneração mensal (art. 457 §1º CLT — inclui gorjetas e habituais)
 */
function calcularMultaArt477(dados, temporal) {
  if (dados.verbasExcluidas?.includes('multa_art_477')) {
    return { valor: 0, excluida: true, memoria: { motivo: 'Excluída do cálculo' } };
  }

  const base = calcularRemuneracaoMensal(dados);
  const dispensa = temporal.dataDispensa;
  const pgto = dados.dataPgtoRescisorio ? toDate(dados.dataPgtoRescisorio) : null;
  const prazo = addDays(dispensa, 10);

  if (!pgto || pgto > prazo) {
    const valor = round2(base);
    return {
      valor,
      excluida: false,
      memoria: {
        formula: `Verbas rescisórias pagas após ${format(prazo, 'dd/MM/yyyy')} — art. 477 §8º CLT = R$ ${valor.toFixed(2)}`,
        base,
        prazo: format(prazo, 'dd/MM/yyyy'),
      },
    };
  }

  return { valor: 0, excluida: false, memoria: { motivo: 'Pagamento efetuado no prazo — multa art. 477 não devida' } };
}

module.exports = { calcularMultaArt467, calcularMultaArt477 };
