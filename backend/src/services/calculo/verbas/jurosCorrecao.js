'use strict';

const { differenceInDays, toDate, format } = require('../../../utils/datas');
const { round2 } = require('../../../utils/formatacao');

/**
 * Reexporta buscarSelicAcumulada para compatibilidade com callers externos
 */
async function buscarSelicAcumulada(dataInicio, dataFim) {
  try {
    const ini = format(toDate(dataInicio), 'dd/MM/yyyy');
    const fim = format(toDate(dataFim), 'dd/MM/yyyy');
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json&dataInicial=${ini}&dataFinal=${fim}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) throw new Error('BACEN API retornou ' + resp.status);
    const dados = await resp.json();
    if (!Array.isArray(dados) || dados.length === 0) return null;
    let fator = 1;
    for (const item of dados) {
      fator *= (1 + parseFloat(item.valor) / 100);
    }
    return { fatorAcumulado: fator, percentualAcumulado: round2((fator - 1) * 100), diasUteis: dados.length };
  } catch {
    return null;
  }
}

/**
 * Busca IPCA-E mensal do banco de dados (tabela ipca_e_historico).
 * Retorna array de { mes_ano: Date, valor: number } ordenado por mes_ano.
 */
async function buscarIpcaEDoBanco(dataInicio, dataFim) {
  try {
    const pool = require('../../../config/database');
    const { rows } = await pool.query(
      `SELECT mes_ano, valor FROM ipca_e_historico
       WHERE mes_ano >= date_trunc('month', $1::date)
         AND mes_ano <= date_trunc('month', $2::date)
       ORDER BY mes_ano`,
      [dataInicio, dataFim]
    );
    return rows.map(r => ({ mesAno: r.mes_ano, valor: parseFloat(r.valor) }));
  } catch {
    return [];
  }
}

/**
 * Busca IPCA mensal do banco de dados (tabela ipca_historico).
 */
async function buscarIpcaDoBanco(dataInicio, dataFim) {
  try {
    const pool = require('../../../config/database');
    const { rows } = await pool.query(
      `SELECT mes_ano, valor FROM ipca_historico
       WHERE mes_ano >= date_trunc('month', $1::date)
         AND mes_ano <= date_trunc('month', $2::date)
       ORDER BY mes_ano`,
      [dataInicio, dataFim]
    );
    return rows.map(r => ({ mesAno: r.mes_ano, valor: parseFloat(r.valor) }));
  } catch {
    return [];
  }
}

/**
 * Acumula fator mensal a partir de array [{ mesAno, valor }] (valor em %)
 */
function acumularFatorMensal(registros) {
  let fator = 1;
  for (const r of registros) {
    fator *= (1 + r.valor / 100);
  }
  return fator;
}

/**
 * Conta meses entre duas datas (fracionário: inclui mês inicial e final proporcional)
 * Para cálculo de juros simples de 1%/mês usamos meses inteiros (arredondado)
 */
function contarMesesEntre(dataInicio, dataFim) {
  const ini = toDate(dataInicio);
  const fim = toDate(dataFim);
  return (fim.getFullYear() - ini.getFullYear()) * 12 + (fim.getMonth() - ini.getMonth());
}

/**
 * Calcula juros e correção monetária conforme ADC 58 STF + Lei 14.905/2024.
 *
 * Três fases:
 * - Fase 1 (pré-judicial, apenas se faseProcessual = 'pre_judicial'):
 *     dataInicioJuros → dataAjuizamento
 *     IPCA-E acumulado × (1.01)^meses  (1% ao mês composto + IPCA-E)
 *
 * - Fase 2 (judicial, se dataAjuizamento ≤ 29/08/2024):
 *     dataAjuizamento → min(hoje, 2024-08-29)
 *     SELIC acumulada (série BACEN 11)
 *
 * - Fase 3 (a partir de 30/08/2024, se hoje > 30/08/2024):
 *     max(dataAjuizamento, 2024-08-30) → hoje
 *     IPCA + max(0, SELIC - IPCA) por período
 *
 * @param {number} baseCalculo
 * @param {string} dataInicioJuros - dataEncerramentoComAviso (pré-judicial) ou dataAjuizamento (judicial)
 * @param {string} dataAjuizamento
 * @param {string} dataCalculo - data base do cálculo (hoje)
 * @param {string} faseProcessual - 'pre_judicial' | 'judicial'
 */
async function calcularJurosADC58(baseCalculo, dataInicioJuros, dataAjuizamento, dataCalculo, faseProcessual = 'pre_judicial') {
  if (!baseCalculo || baseCalculo <= 0 || !dataAjuizamento) {
    return { valor: 0, fator: 1, percentual: 0, fases: [], memoria: { motivo: 'Base ou data de ajuizamento não informada' } };
  }

  const hoje = dataCalculo || format(new Date(), 'yyyy-MM-dd');
  const DATA_MARCO = '2024-08-30'; // Lei 14.905/2024 vigora a partir de 30/08/2024
  const DATA_MARCO_ANTERIOR = '2024-08-29';

  const fases = [];
  let fatorTotal = 1;

  // === FASE 1: Pré-judicial (IPCA-E + 1%/mês) — apenas faseProcessual = 'pre_judicial' ===
  if (faseProcessual === 'pre_judicial' && dataInicioJuros && dataAjuizamento > dataInicioJuros) {
    const registrosIpcaE = await buscarIpcaEDoBanco(dataInicioJuros, dataAjuizamento);
    const meses = Math.max(0, contarMesesEntre(dataInicioJuros, dataAjuizamento));

    let fatorIpcaE = 1;
    let fatorMora = 1;
    let estimadoFase1 = false;

    if (registrosIpcaE.length > 0) {
      fatorIpcaE = acumularFatorMensal(registrosIpcaE);
    } else {
      // Estimativa: usar IPCA-E médio histórico 0.40%/mês
      fatorIpcaE = Math.pow(1 + 0.004, meses);
      estimadoFase1 = true;
    }

    if (meses > 0) {
      fatorMora = Math.pow(1.01, meses); // 1% ao mês composto
    }

    const fator1 = fatorIpcaE * fatorMora;
    fatorTotal *= fator1;

    fases.push({
      descricao: 'Pré-judicial: IPCA-E + 1%/mês (art. 39 Lei 8.177/91)',
      periodo: `${format(toDate(dataInicioJuros), 'dd/MM/yyyy')} a ${format(toDate(dataAjuizamento), 'dd/MM/yyyy')}`,
      meses,
      fatorIpcaE: round2(fatorIpcaE),
      fatorMora: round2(fatorMora),
      fator: round2(fator1),
      percentual: round2((fator1 - 1) * 100),
      estimado: estimadoFase1,
    });
  }

  // === FASE 2: Judicial até 29/08/2024 (SELIC) ===
  const dataInicioFase2 = faseProcessual === 'judicial' ? dataInicioJuros || dataAjuizamento : dataAjuizamento;
  const dataFimFase2 = DATA_MARCO_ANTERIOR; // 29/08/2024

  if (dataInicioFase2 <= dataFimFase2 && hoje > dataInicioFase2) {
    const dataFimEfetiva = hoje < dataFimFase2 ? hoje : dataFimFase2;
    if (dataInicioFase2 < dataFimEfetiva) {
      const selic2 = await buscarSelicAcumulada(dataInicioFase2, dataFimEfetiva);
      let fator2 = 1;
      let estimado2 = false;

      if (selic2) {
        fator2 = selic2.fatorAcumulado;
      } else {
        // Fallback: 15% a.a. = 0.0596% a.d.
        const dias = differenceInDays(toDate(dataFimEfetiva), toDate(dataInicioFase2));
        fator2 = Math.pow(1 + 0.15 / 252, dias);
        estimado2 = true;
      }

      fatorTotal *= fator2;
      fases.push({
        descricao: 'Judicial (até 29/08/2024): SELIC',
        periodo: `${format(toDate(dataInicioFase2), 'dd/MM/yyyy')} a ${format(toDate(dataFimEfetiva), 'dd/MM/yyyy')}`,
        fator: round2(fator2),
        percentual: round2((fator2 - 1) * 100),
        diasUteis: selic2?.diasUteis || null,
        estimado: estimado2,
      });
    }
  }

  // === FASE 3: A partir de 30/08/2024 (IPCA + max(0, SELIC - IPCA)) ===
  if (hoje > DATA_MARCO) {
    const dataInicioFase3 = dataInicioFase2 > DATA_MARCO ? dataInicioFase2 : DATA_MARCO;
    if (dataInicioFase3 < hoje) {
      const [registrosIpca, selic3] = await Promise.all([
        buscarIpcaDoBanco(dataInicioFase3, hoje),
        buscarSelicAcumulada(dataInicioFase3, hoje),
      ]);

      let fatorIpca = 1;
      let fatorJuros = 1;
      let estimado3 = false;

      if (registrosIpca.length > 0) {
        fatorIpca = acumularFatorMensal(registrosIpca);
      } else {
        const meses3 = Math.max(1, contarMesesEntre(dataInicioFase3, hoje));
        fatorIpca = Math.pow(1 + 0.004, meses3);
        estimado3 = true;
      }

      if (selic3) {
        // Calcula juros = max(0, SELIC_acumulada - IPCA_acumulado) mensalmente
        // Simplificação: usa fatorSELIC / fatorIPCA como proxy (resultado semelhante)
        const fatorSelicIpca = selic3.fatorAcumulado / fatorIpca;
        fatorJuros = Math.max(1, fatorSelicIpca);
      } else {
        estimado3 = true;
      }

      const fator3 = fatorIpca * fatorJuros;
      fatorTotal *= fator3;

      fases.push({
        descricao: 'A partir de 30/08/2024: IPCA + max(0, SELIC−IPCA) (Lei 14.905/2024)',
        periodo: `${format(toDate(dataInicioFase3), 'dd/MM/yyyy')} a ${format(toDate(hoje), 'dd/MM/yyyy')}`,
        fatorIpca: round2(fatorIpca),
        fatorJuros: round2(fatorJuros),
        fator: round2(fator3),
        percentual: round2((fator3 - 1) * 100),
        estimado: estimado3,
      });
    }
  }

  // Se nenhuma fase gerou fator, fallback para SELIC simples
  if (fases.length === 0) {
    const diasTotal = differenceInDays(toDate(hoje), toDate(dataAjuizamento));
    if (diasTotal > 0) {
      const selic = await buscarSelicAcumulada(dataAjuizamento, hoje);
      if (selic) {
        fatorTotal = selic.fatorAcumulado;
        fases.push({
          descricao: 'SELIC (fallback)',
          periodo: `${format(toDate(dataAjuizamento), 'dd/MM/yyyy')} a ${format(toDate(hoje), 'dd/MM/yyyy')}`,
          fator: round2(selic.fatorAcumulado),
          percentual: selic.percentualAcumulado,
          diasUteis: selic.diasUteis,
          estimado: false,
        });
      }
    }
  }

  const valor = round2(baseCalculo * (fatorTotal - 1));
  const percentualTotal = round2((fatorTotal - 1) * 100);
  const estimado = fases.some(f => f.estimado);

  return {
    valor,
    fator: round2(fatorTotal),
    percentual: percentualTotal,
    fases,
    estimado,
    memoria: {
      formula: `Base R$ ${baseCalculo.toFixed(2)} × (fator total ${fatorTotal.toFixed(6)} − 1) = R$ ${valor.toFixed(2)}`,
      faseProcessual,
      dataInicioJuros: dataInicioJuros ? format(toDate(dataInicioJuros), 'dd/MM/yyyy') : null,
      periodoTotal: `${format(toDate(dataAjuizamento), 'dd/MM/yyyy')} a ${format(toDate(hoje), 'dd/MM/yyyy')}`,
      percentualTotal: `${percentualTotal.toFixed(4)}%`,
      aviso: estimado ? 'Parte do cálculo usa estimativa — API do BACEN ou tabela de índices indisponível.' : undefined,
    },
  };
}

/**
 * Compatibilidade retroativa com código que chama calcularJurosSelic
 */
async function calcularJurosSelic(baseCalculo, dataAjuizamento, dataCalculo) {
  return calcularJurosADC58(baseCalculo, dataAjuizamento, dataAjuizamento, dataCalculo, 'judicial');
}

module.exports = { calcularJurosADC58, calcularJurosSelic, buscarSelicAcumulada };
