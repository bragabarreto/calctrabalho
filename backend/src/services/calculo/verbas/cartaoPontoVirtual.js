'use strict';

const {
  toDate, addDays, differenceInDays, format, parseISO, isValid,
} = require('../../../utils/datas');

/**
 * Verifica se uma data cai dentro de algum período de afastamento.
 */
function estaEmAfastamento(data, afastamentos) {
  for (const a of afastamentos) {
    const ini = toDate(a.inicio);
    const fim = toDate(a.fim);
    if (data >= ini && data <= fim) return true;
  }
  return false;
}

/**
 * Converte string "HH:MM" para minutos desde meia-noite.
 */
function toMinutos(hhmm) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Gera um cartão de ponto virtual baseado na jornada definida e nas datas do contrato.
 *
 * @param {Object} jornadaDefinida - { horaEntrada, horaSaida, intervaloMinutos, diasSemana: [0-6] }
 * @param {string} dataInicio - Data de início do período (marco prescricional ou admissão)
 * @param {string} dataFim    - Data de dispensa
 * @param {Array}  afastamentos - [{ inicio, fim, motivo }]
 * @param {number} divisorJornada - Divisor contratual (ex: 220 = 44h/sem, 180 = 36h/sem, etc.)
 * @returns {Object} { totalHorasExtras, totalMinutosExtras, distribuicaoMensal, dias }
 */
function gerarCartaoPontoVirtual(jornadaDefinida, dataInicio, dataFim, afastamentos = [], divisorJornada = 220) {
  const inicio = toDate(dataInicio);
  const fim = toDate(dataFim);

  const {
    horaEntrada,
    horaSaida,
    intervaloMinutos = 60,
    diasSemana = [1, 2, 3, 4, 5], // seg=1 ... sex=5
  } = jornadaDefinida;

  const entradaMin = toMinutos(horaEntrada);
  const saidaMin = toMinutos(horaSaida);
  // Minutos trabalhados brutos por dia
  const minBrutosDia = saidaMin - entradaMin;
  // Minutos líquidos por dia (descontando intervalo)
  const minLiquidosDia = Math.max(0, minBrutosDia - (intervaloMinutos || 0));

  // Jornada contratual por dia: divisor/semana → minutos/dia
  // divisorJornada é mensal. Semana = divisorJornada / (52/12) ≈ divisorJornada * 12/52
  const horasSemanais = (divisorJornada * 12) / 52;
  const minContratualDia = (horasSemanais * 60) / diasSemana.length;

  let totalMinutosExtras = 0;
  const distribuicaoMensal = {};
  const dias = [];

  let current = new Date(inicio);
  while (current <= fim) {
    const diaSemana = current.getDay(); // 0=dom..6=sab
    const chavesMes = format(current, 'yyyy-MM');

    if (diasSemana.includes(diaSemana) && !estaEmAfastamento(current, afastamentos)) {
      // Dia de trabalho não afastado
      const minExtras = Math.max(0, minLiquidosDia - minContratualDia);
      totalMinutosExtras += minExtras;

      if (!distribuicaoMensal[chavesMes]) {
        distribuicaoMensal[chavesMes] = { diasTrabalhados: 0, minutosExtras: 0 };
      }
      distribuicaoMensal[chavesMes].diasTrabalhados++;
      distribuicaoMensal[chavesMes].minutosExtras += minExtras;

      dias.push({
        data: format(current, 'yyyy-MM-dd'),
        minutosLiquidos: minLiquidosDia,
        minutosContratual: Math.round(minContratualDia),
        minutosExtras: Math.round(minExtras),
        afastado: false,
      });
    } else if (estaEmAfastamento(current, afastamentos)) {
      dias.push({ data: format(current, 'yyyy-MM-dd'), afastado: true, minutosExtras: 0 });
    }

    current = addDays(current, 1);
  }

  const totalHorasExtras = totalMinutosExtras / 60;

  // Converte distribuição para array ordenado
  const distribuicaoArray = Object.entries(distribuicaoMensal).map(([mes, d]) => ({
    mes,
    diasTrabalhados: d.diasTrabalhados,
    horasExtras: +(d.minutosExtras / 60).toFixed(2),
  }));

  return {
    totalHorasExtras: +totalHorasExtras.toFixed(2),
    totalMinutosExtras,
    distribuicaoMensal: distribuicaoArray,
    totalDias: dias.length,
  };
}

module.exports = { gerarCartaoPontoVirtual };
