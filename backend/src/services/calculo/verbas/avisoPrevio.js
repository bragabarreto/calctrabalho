'use strict';

const { round2 } = require('../../../utils/formatacao');
const { differenceInYears } = require('../../../utils/datas');

/**
 * Aviso Prévio (indenizado)
 * Fórmula: (salário + comissões) / 30 × (30 + anos × 3), máximo 90 dias
 * Culpa recíproca = metade
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

  const base = (dados.ultimoSalario || 0) + (dados.comissoes || 0);
  const anosServico = differenceInYears(temporal.dataDispensa, temporal.dataAdmissao);
  const dias = Math.min(30 + anosServico * 3, 90);
  let valor = round2((base / 30) * dias);

  if (modalidade === 'culpa_reciproca') {
    valor = round2(valor / 2);
  }

  return {
    valor,
    excluida: false,
    memoria: {
      formula: `(R$ ${base.toFixed(2)} / 30) × ${dias} dias${modalidade === 'culpa_reciproca' ? ' / 2 (culpa recíproca)' : ''} = R$ ${valor.toFixed(2)}`,
      base,
      anosServico,
      dias,
      modalidade,
    },
  };
}

module.exports = { calcularAvisoPrevio };
