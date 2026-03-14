'use strict';

const { differenceInDays, toDate, format, addDays } = require('../../../utils/datas');
const { round2 } = require('../../../utils/formatacao');

/**
 * Retorna o último dia do mês corrente no formato 'yyyy-MM-dd'.
 * A atualização é sempre apurada até o último dia do mês em que o cálculo é elaborado.
 */
function ultimoDiaMesAtual() {
  const hoje = new Date();
  const ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return format(ultimo, 'yyyy-MM-dd');
}

/** Busca SELIC diária acumulada (série BACEN 11) entre duas datas. */
async function buscarSelicAcumulada(dataInicio, dataFim) {
  try {
    const ini = format(toDate(dataInicio), 'dd/MM/yyyy');
    const fim = format(toDate(dataFim), 'dd/MM/yyyy');
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json&dataInicial=${ini}&dataFinal=${fim}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) throw new Error('BACEN ' + resp.status);
    const dados = await resp.json();
    if (!Array.isArray(dados) || dados.length === 0) return null;
    let fator = 1;
    for (const item of dados) fator *= (1 + parseFloat(item.valor) / 100);
    return { fatorAcumulado: fator, percentualAcumulado: round2((fator - 1) * 100), diasUteis: dados.length };
  } catch { return null; }
}

/** Busca IPCA-E mensal do banco (tabela ipca_e_historico). */
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
  } catch { return []; }
}

/** Busca IPCA mensal do banco (tabela ipca_historico). */
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
  } catch { return []; }
}

/** Acumula fator a partir de registros mensais [{ valor (%) }]. */
function acumularFatorMensal(registros) {
  let fator = 1;
  for (const r of registros) fator *= (1 + r.valor / 100);
  return fator;
}

/** Conta meses completos entre duas datas (inteiro). */
function contarMesesEntre(dataInicio, dataFim) {
  const ini = toDate(dataInicio);
  const fim = toDate(dataFim);
  return (fim.getFullYear() - ini.getFullYear()) * 12 + (fim.getMonth() - ini.getMonth());
}

/**
 * Calcula juros e correção monetária conforme ADC 58 STF + Lei 14.905/2024.
 *
 * As duas fases são SEMPRE apuradas em sequência (não se excluem):
 *
 *   FASE 1 — Pré-judicial
 *     De: dataEncerramentoComAviso (fim do contrato + aviso projetado)
 *     Até: dia anterior ao ajuizamento (exclusive)
 *     Critério: IPCA-E acumulado × (1,01)^meses  (correção + 1%/mês de mora)
 *
 *   FASE 2 — Judicial (SELIC), vigente até 29/08/2024
 *     De: dataAjuizamento
 *     Até: min(dataApuracao, 29/08/2024)
 *     Critério: SELIC diária acumulada (série BACEN 11)
 *
 *   FASE 3 — Judicial (Lei 14.905/2024), a partir de 30/08/2024
 *     De: max(dataAjuizamento, 30/08/2024)
 *     Até: dataApuracao (último dia do mês corrente)
 *     Critério: IPCA (correção) + max(0, SELIC − IPCA) (juros de mora)
 *
 * dataApuracao = último dia do mês em que os cálculos estão sendo elaborados.
 *
 * @param {number} baseCalculo
 * @param {string|Date} dataEncerramentoComAviso
 * @param {string|Date} dataAjuizamento
 */
async function calcularJurosADC58(baseCalculo, dataEncerramentoComAviso, dataAjuizamento) {
  if (!baseCalculo || baseCalculo <= 0 || !dataAjuizamento || !dataEncerramentoComAviso) {
    return { valor: 0, fator: 1, percentual: 0, fases: [], dataApuracao: ultimoDiaMesAtual(),
      memoria: { motivo: 'Base, data de encerramento ou data de ajuizamento não informada' } };
  }

  // Data de apuração = último dia do mês corrente
  const dataApuracao = ultimoDiaMesAtual();

  // Normaliza para string yyyy-MM-dd
  const dtEncerramento = format(toDate(dataEncerramentoComAviso), 'yyyy-MM-dd');
  const dtAjuizamento  = format(toDate(dataAjuizamento), 'yyyy-MM-dd');

  const DATA_MARCO      = '2024-08-30'; // vigência Lei 14.905/2024
  const DATA_MARCO_ANTE = '2024-08-29';

  const fases = [];
  let fatorTotal = 1;

  // ── FASE 1: Pré-judicial ────────────────────────────────────────────────
  // Período: dtEncerramento até o dia ANTES do ajuizamento
  const dtFimFase1 = format(addDays(toDate(dtAjuizamento), -1), 'yyyy-MM-dd');

  if (dtEncerramento < dtAjuizamento) {
    // IPCA-E: do mês de encerramento até o mês do dtFimFase1
    const registrosIpcaE = await buscarIpcaEDoBanco(dtEncerramento, dtFimFase1);
    const meses = Math.max(0, contarMesesEntre(dtEncerramento, dtAjuizamento));

    let fatorIpcaE = 1;
    let fatorMora  = 1;
    let estimado1  = false;

    if (registrosIpcaE.length > 0) {
      fatorIpcaE = acumularFatorMensal(registrosIpcaE);
    } else {
      fatorIpcaE = Math.pow(1.004, meses); // fallback 0,40%/mês médio histórico
      estimado1 = true;
    }
    if (meses > 0) fatorMora = Math.pow(1.01, meses); // 1%/mês composto

    const fator1 = fatorIpcaE * fatorMora;
    fatorTotal *= fator1;

    fases.push({
      descricao: 'Pré-judicial: IPCA-E + 1%/mês (art. 39 Lei 8.177/91)',
      periodo: `${format(toDate(dtEncerramento), 'dd/MM/yyyy')} a ${format(toDate(dtFimFase1), 'dd/MM/yyyy')}`,
      meses,
      fatorIpcaE: round2(fatorIpcaE),
      fatorMora:  round2(fatorMora),
      fator:      round2(fator1),
      percentual: round2((fator1 - 1) * 100),
      estimado:   estimado1,
    });
  }

  // ── FASE 2: Judicial SELIC (ajuizamento → 29/08/2024) ──────────────────
  // Aplica-se se o ajuizamento ocorreu antes de 30/08/2024
  if (dtAjuizamento <= DATA_MARCO_ANTE && dataApuracao >= dtAjuizamento) {
    const dtFimFase2 = dataApuracao < DATA_MARCO_ANTE ? dataApuracao : DATA_MARCO_ANTE;
    if (dtAjuizamento <= dtFimFase2) {
      const selic2 = await buscarSelicAcumulada(dtAjuizamento, dtFimFase2);
      let fator2   = 1;
      let estimado2 = false;

      if (selic2) {
        fator2 = selic2.fatorAcumulado;
      } else {
        const dias = differenceInDays(toDate(dtFimFase2), toDate(dtAjuizamento));
        fator2 = Math.pow(1 + 0.1375 / 252, dias); // fallback ~13,75% a.a.
        estimado2 = true;
      }

      fatorTotal *= fator2;
      fases.push({
        descricao: 'Judicial: SELIC (ajuizamento a 29/08/2024)',
        periodo:   `${format(toDate(dtAjuizamento), 'dd/MM/yyyy')} a ${format(toDate(dtFimFase2), 'dd/MM/yyyy')}`,
        fator:     round2(fator2),
        percentual: round2((fator2 - 1) * 100),
        diasUteis:  selic2?.diasUteis ?? null,
        estimado:   estimado2,
      });
    }
  }

  // ── FASE 3: Lei 14.905/2024 (a partir de 30/08/2024) ───────────────────
  // Aplica-se se dataApuracao > 30/08/2024
  if (dataApuracao > DATA_MARCO) {
    // Início: o maior entre ajuizamento e 30/08/2024
    const dtInicioFase3 = dtAjuizamento > DATA_MARCO ? dtAjuizamento : DATA_MARCO;

    if (dtInicioFase3 <= dataApuracao) {
      const [registrosIpca, selic3] = await Promise.all([
        buscarIpcaDoBanco(dtInicioFase3, dataApuracao),
        buscarSelicAcumulada(dtInicioFase3, dataApuracao),
      ]);

      let fatorIpca  = 1;
      let fatorJuros = 1;
      let estimado3  = false;

      if (registrosIpca.length > 0) {
        fatorIpca = acumularFatorMensal(registrosIpca);
      } else {
        const m3 = Math.max(1, contarMesesEntre(dtInicioFase3, dataApuracao));
        fatorIpca = Math.pow(1.004, m3);
        estimado3 = true;
      }

      if (selic3) {
        // juros de mora = max(0, SELIC acumulada − IPCA acumulada) — proxy por divisão dos fatores
        const razao = selic3.fatorAcumulado / fatorIpca;
        fatorJuros = Math.max(1, razao);
      } else {
        estimado3 = true;
      }

      const fator3 = fatorIpca * fatorJuros;
      fatorTotal *= fator3;

      fases.push({
        descricao: 'Judicial: IPCA + max(0, SELIC−IPCA) — Lei 14.905/2024 (a partir de 30/08/2024)',
        periodo:   `${format(toDate(dtInicioFase3), 'dd/MM/yyyy')} a ${format(toDate(dataApuracao), 'dd/MM/yyyy')}`,
        fatorIpca:  round2(fatorIpca),
        fatorJuros: round2(fatorJuros),
        fator:      round2(fator3),
        percentual: round2((fator3 - 1) * 100),
        estimado:   estimado3,
      });
    }
  }

  // Fallback: se nenhuma fase gerou resultado (ex: ajuizamento = hoje), retorna zero
  if (fases.length === 0) {
    return { valor: 0, fator: 1, percentual: 0, fases: [], dataApuracao,
      memoria: { motivo: 'Período insuficiente para apuração de juros' } };
  }

  const valor         = round2(baseCalculo * (fatorTotal - 1));
  const percentualTot = round2((fatorTotal - 1) * 100);
  const estimado      = fases.some(f => f.estimado);

  return {
    valor,
    fator:    round2(fatorTotal),
    percentual: percentualTot,
    fases,
    dataApuracao,
    estimado,
    memoria: {
      formula:       `Base R$ ${baseCalculo.toFixed(2)} × (fator ${fatorTotal.toFixed(6)} − 1) = R$ ${valor.toFixed(2)}`,
      dataApuracao:  format(toDate(dataApuracao), 'dd/MM/yyyy'),
      dataEncerramento: format(toDate(dtEncerramento), 'dd/MM/yyyy'),
      periodoTotal:  `${format(toDate(dtEncerramento), 'dd/MM/yyyy')} a ${format(toDate(dataApuracao), 'dd/MM/yyyy')}`,
      percentualTotal: `${percentualTot.toFixed(4)}%`,
      aviso: estimado ? 'Parte do cálculo usa estimativa — API do BACEN ou índices do banco indisponíveis.' : undefined,
    },
  };
}

/** Compatibilidade retroativa */
async function calcularJurosSelic(baseCalculo, dataAjuizamento, dataCalculo) {
  return calcularJurosADC58(baseCalculo, dataAjuizamento, dataAjuizamento);
}

module.exports = { calcularJurosADC58, calcularJurosSelic, buscarSelicAcumulada, ultimoDiaMesAtual };
