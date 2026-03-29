'use strict';

const { round2 } = require('../../../utils/formatacao');
const { differenceInYears } = require('../../../utils/datas');
const { calcularBaseRescisoria } = require('../../../utils/baseRescisoria');

/**
 * Aviso Prévio (indenizado)
 * Fórmula: (salário + comissões) / 30 × (30 + anos × 3), máximo 90 dias
 * Culpa recíproca = metade
 * Base: art. 487 CLT + Lei 12.506/2011
 */
function calcularAvisoPrevio(dados, temporal, modalidade) {
  if (dados.avisoPrevioTrabalhado) {
    return { valor: 0, excluida: false, memoria: { motivo: 'Aviso prévio trabalhado — sem ônus' } };
  }
  if (dados.verbasExcluidas?.includes('aviso_previo')) {
    return { valor: 0, excluida: true, memoria: { motivo: 'Excluída do cálculo' } };
  }
  if (modalidade === 'pedido_demissao' || modalidade === 'justa_causa') {
    return { valor: 0, excluida: false, memoria: { motivo: `Modalidade ${modalidade} — aviso prévio não devido` } };
  }

  const { valor: base } = calcularBaseRescisoria(dados, { incluirGorjetas: false });
  // dias vem de temporal.diasAvisoPrevio (já dividido por 2 e arredondado pra cima em culpa recíproca)
  const dias = temporal.diasAvisoPrevio;
  const valor = round2((base / 30) * dias);

  return {
    valor,
    excluida: false,
    memoria: {
      formula: `(R$ ${base.toFixed(2)} / 30) × ${dias} dias${modalidade === 'culpa_reciproca' ? ' (metade — culpa recíproca)' : ''} = R$ ${valor.toFixed(2)}`,
      fundamentoLegal: 'Art. 487 CLT c/c Lei 12.506/2011 — aviso prévio proporcional ao tempo de serviço.',
      base,
      dias,
      modalidade,
    },
  };
}

module.exports = { calcularAvisoPrevio };
