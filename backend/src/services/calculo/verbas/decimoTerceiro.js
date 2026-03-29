'use strict';

const { round2, nonNegative } = require('../../../utils/formatacao');
const { calcularBaseRescisoria } = require('../../../utils/baseRescisoria');

/**
 * 13º Salário Integral (vencidos não pagos)
 * Base: salário + comissões + gorjetas (Súmula 354 TST)
 */
function calcularDecimoTerceiroIntegral(dados, temporal) {
  if (dados.verbasExcluidas?.includes('decimo_terceiro_integral')) {
    return { valor: 0, excluida: true, memoria: { motivo: 'Excluída do cálculo' } };
  }
  const qtde = dados.qtdeDecimoTerceiroVencidos || 0;
  if (qtde === 0) return { valor: 0, excluida: false, memoria: { motivo: 'Nenhum 13º integral informado' } };

  // Gorjetas integram base do 13º integral (Súmula 354 TST) — padronizado com proporcional
  const dadosBase = dados.mediaSalarial ? { ...dados, ultimoSalario: dados.mediaSalarial } : dados;
  const { valor: base } = calcularBaseRescisoria(dadosBase, { incluirGorjetas: true });
  const bruto = round2(base * qtde);
  const desconto = dados.valorPagoParcialDecimo || 0;
  const valor = nonNegative(round2(bruto - desconto));

  return {
    valor,
    excluida: false,
    memoria: {
      formula: desconto > 0
        ? `R$ ${base.toFixed(2)} × ${qtde} = R$ ${bruto.toFixed(2)} − R$ ${desconto.toFixed(2)} (pago parcialmente) = R$ ${valor.toFixed(2)}`
        : `R$ ${base.toFixed(2)} × ${qtde} = R$ ${valor.toFixed(2)}`,
      base,
      qtde,
      ...(desconto > 0 && { descontoPagoParcialmente: desconto }),
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

  // Se informado como integralmente pago (sem valor de desconto), nada é devido
  if (dados.decimoProporcionalPago && !dados.valorPagoDecimoTerceiroProporcional) {
    return { valor: 0, excluida: false, memoria: { motivo: '13º proporcional informado como integralmente pago' } };
  }

  // Gorjetas integram base do 13º (Súmula 354 TST) — padronizado via baseRescisoria
  const dadosBase13 = dados.mediaSalarial ? { ...dados, ultimoSalario: dados.mediaSalarial } : dados;
  const { valor: base } = calcularBaseRescisoria(dadosBase13, { incluirGorjetas: true });
  // OJ 82 SDI1 TST: aviso prévio indenizado projeta para o 13º proporcional
  const meses = temporal.lapsoComAviso.mesesRestantes;
  const dias = temporal.lapsoComAviso.diasRestantes;
  const mesesEfetivos = dias >= 15 ? meses + 1 : meses;

  if (mesesEfetivos === 0) {
    return { valor: 0, excluida: false, memoria: { motivo: 'Menos de 15 dias no ano — 13º não devido' } };
  }

  const bruto = round2((base / 12) * mesesEfetivos);
  const desconto = dados.valorPagoDecimoTerceiroProporcional || 0;
  const valor = desconto > 0 ? nonNegative(round2(bruto - desconto)) : bruto;

  return {
    valor,
    excluida: false,
    memoria: {
      formula: desconto > 0
        ? `R$ ${base.toFixed(2)} / 12 × ${mesesEfetivos} meses = R$ ${bruto.toFixed(2)} − R$ ${desconto.toFixed(2)} (pago parcialmente) = R$ ${valor.toFixed(2)}`
        : `R$ ${base.toFixed(2)} / 12 × ${mesesEfetivos} meses = R$ ${valor.toFixed(2)}`,
      base,
      meses,
      diasRestantes: dias,
      mesesEfetivos,
      ...(desconto > 0 && { descontoPagoParcialmente: desconto }),
    },
  };
}

module.exports = { calcularDecimoTerceiroIntegral, calcularDecimoTerceiroProporcional };
