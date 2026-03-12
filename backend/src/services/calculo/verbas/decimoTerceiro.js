'use strict';

const { round2 } = require('../../../utils/formatacao');

/**
 * 13º Salário Integral (vencidos não pagos)
 */
function calcularDecimoTerceiroIntegral(dados, temporal) {
  if (dados.verbasExcluidas?.includes('decimo_terceiro_integral')) {
    return { valor: 0, excluida: true, memoria: { motivo: 'Excluída do cálculo' } };
  }
  const qtde = dados.qtdeDecimoTerceiroVencidos || 0;
  if (qtde === 0) return { valor: 0, excluida: false, memoria: { motivo: 'Nenhum 13º integral informado' } };

  const base = (dados.mediaSalarial || dados.ultimoSalario || 0) + (dados.comissoes || 0);
  const valor = round2(base * qtde);

  return {
    valor,
    excluida: false,
    memoria: {
      formula: `R$ ${base.toFixed(2)} × ${qtde} = R$ ${valor.toFixed(2)}`,
      base,
      qtde,
    },
  };
}

/**
 * 13º Salário Proporcional
 * Fórmula: base / 12 × meses trabalhados no ano
 * Meses: conta mês com >= 15 dias trabalhados
 */
function calcularDecimoTerceiroProporcional(dados, temporal) {
  if (dados.verbasExcluidas?.includes('decimo_terceiro_proporcional')) {
    return { valor: 0, excluida: true, memoria: { motivo: 'Excluída do cálculo' } };
  }

  const base = (dados.mediaSalarial || dados.ultimoSalario || 0) + (dados.comissoes || 0);
  // Meses trabalhados no ano corrente (sem aviso, pois aviso projeta para férias mas não 13º)
  const meses = temporal.lapsoSemAviso.mesesRestantes;
  const dias = temporal.lapsoSemAviso.diasRestantes;
  const mesesEfetivos = dias >= 15 ? meses + 1 : meses;

  if (mesesEfetivos === 0) {
    return { valor: 0, excluida: false, memoria: { motivo: 'Menos de 15 dias no ano — 13º não devido' } };
  }

  const valor = round2((base / 12) * mesesEfetivos);

  return {
    valor,
    excluida: false,
    memoria: {
      formula: `R$ ${base.toFixed(2)} / 12 × ${mesesEfetivos} meses = R$ ${valor.toFixed(2)}`,
      base,
      meses,
      diasRestantes: dias,
      mesesEfetivos,
    },
  };
}

module.exports = { calcularDecimoTerceiroIntegral, calcularDecimoTerceiroProporcional };
