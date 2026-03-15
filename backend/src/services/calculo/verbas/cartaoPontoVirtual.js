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

/**
 * Calcula horas extras de um período de jornada com suporte a padrões diário/semanal/misto/12x36.
 *
 * @param {Object} periodo   - Configuração do período (campos do jornadaPeriodos)
 * @param {string} dataAdm   - dataAdmissao do contrato (fallback quando periodo.dataInicio = null)
 * @param {string} dataDisp  - dataDispensa do contrato (fallback quando periodo.dataFim = null)
 * @returns {Object} { totalHorasExtras, totalHorasNoturnas, distribuicaoMensal, numMeses }
 */
function calcularPeriodoJornada(periodo, dataAdm, dataDisp) {
  const inicio = toDate(periodo.dataInicio || dataAdm);
  const fim = toDate(periodo.dataFim || dataDisp);
  const padraoApuracao = periodo.padraoApuracao || 'diario';
  const divisor = periodo.divisorJornada || 220;
  const afastamentos = periodo.afastamentos || [];

  // Jornada contratual derivada do divisor
  // Relação: divisor = horasSemanais × 5 (Súmula TST 431: 220 ÷ 5 = 44h/sem)
  const horasSemanais = divisor / 5;
  const diasTrabalhadosSemana = (periodo.diasSemana || [1, 2, 3, 4, 5]).length;
  const horasContratualDiaria = horasSemanais / Math.max(1, diasTrabalhadosSemana);
  // Para 12x36: jornada padrão do turno é informada separadamente
  const horasJornadaPadrao12x36 = periodo.horasJornadaPadrao12x36 ?? 12;

  if (periodo.modoEntrada === 'medio') {
    // Modo médio: calcular com base em médias informadas pelo usuário
    const distribuicaoMensal = {};
    let current = new Date(inicio);
    while (current <= fim) {
      const mes = format(current, 'yyyy-MM');
      if (!distribuicaoMensal[mes]) distribuicaoMensal[mes] = true;
      current = addDays(current, 1);
    }
    const meses = Object.keys(distribuicaoMensal);
    const numMeses = meses.length || 1;

    let heTotal = 0;
    let hnTotal = 0;
    const distArray = [];

    if (padraoApuracao === 'diario') {
      const heDia = periodo.mediaHorasExtrasDiarias || 0;
      const hnDia = periodo.mediaHorasNoturnasDiarias || 0;
      // Estimar dias úteis por mês (~21.75)
      const diasUteisMedia = 21.75;
      meses.forEach(mes => {
        const he = +(heDia * diasUteisMedia).toFixed(2);
        const hn = +(hnDia * diasUteisMedia).toFixed(2);
        heTotal += he;
        hnTotal += hn;
        distArray.push({ mes, horasExtras: he, horasNoturnas: hn });
      });
    } else if (padraoApuracao === 'semanal' || padraoApuracao === 'misto') {
      const heSemana = periodo.mediaHorasExtrasSemanais || 0;
      const hnDia = periodo.mediaHorasNoturnasDiarias || 0;
      // ~4.33 semanas/mês
      meses.forEach(mes => {
        const he = +(heSemana * 4.33).toFixed(2);
        const hn = +(hnDia * 21.75).toFixed(2);
        heTotal += he;
        hnTotal += hn;
        distArray.push({ mes, horasExtras: he, horasNoturnas: hn });
      });
    } else if (padraoApuracao === '12x36') {
      // ~15 turnos/mês em regime 12x36
      const heTurno = periodo.mediaHorasExtrasPorTurno || 0;
      meses.forEach(mes => {
        const he = +(heTurno * 15).toFixed(2);
        heTotal += he;
        distArray.push({ mes, horasExtras: he, horasNoturnas: 0 });
      });
    }

    return {
      totalHorasExtras: +heTotal.toFixed(2),
      totalHorasNoturnas: +hnTotal.toFixed(2),
      distribuicaoMensal: distArray,
      numMeses,
    };
  }

  // Modo cartão de ponto: calcula dia a dia
  const {
    horaEntrada,
    horaSaida,
    intervaloMinutos = 60,
    diasSemana = [1, 2, 3, 4, 5],
  } = periodo;

  const entradaMin = toMinutos(horaEntrada);
  const saidaMin = toMinutos(horaSaida);
  const minLiquidosDia = Math.max(0, (saidaMin - entradaMin) - (intervaloMinutos || 0));

  // Limite diário em minutos derivado do divisor
  const minContratualDia = (horasContratualDiaria * 60);

  let totalMinHE = 0;
  let totalMinHN = 0;
  const distribuicaoMensal = {};

  let current = new Date(inicio);
  while (current <= fim) {
    const diaSemana = current.getDay();
    const mes = format(current, 'yyyy-MM');

    if (diasSemana.includes(diaSemana) && !estaEmAfastamento(current, afastamentos)) {
      let minHE = 0;
      let minHN = 0;

      if (padraoApuracao === 'diario') {
        minHE = Math.max(0, minLiquidosDia - minContratualDia);
      } else if (padraoApuracao === '12x36') {
        // Para 12×36: compara jornada efetiva vs padrão do turno (default 12h)
        minHE = Math.max(0, minLiquidosDia - horasJornadaPadrao12x36 * 60);
      }
      // Para semanal/misto: HE diária = 0 (será calculada semanalmente abaixo)
      // Para misto: adiciona excesso diário também
      if (padraoApuracao === 'misto') {
        minHE = Math.max(0, minLiquidosDia - minContratualDia);
      }

      totalMinHE += minHE;
      totalMinHN += minHN;

      if (!distribuicaoMensal[mes]) distribuicaoMensal[mes] = { diasTrabalhados: 0, minutosHE: 0, minutosHN: 0 };
      distribuicaoMensal[mes].diasTrabalhados++;
      distribuicaoMensal[mes].minutosHE += minHE;
    }

    current = addDays(current, 1);
  }

  // Para padrão semanal: calcular HE semanal acumulando por semana
  if (padraoApuracao === 'semanal' || padraoApuracao === 'misto') {
    // Recalcular por semana
    const minContratualSemana = horasSemanais * 60;
    const semanas = {};
    // Helper: chave da semana = data da segunda-feira da semana
    function chaveSemanaDe(d) {
      const day = d.getDay(); // 0=Dom
      const diff = day === 0 ? -6 : 1 - day;
      const seg = new Date(d);
      seg.setDate(seg.getDate() + diff);
      return format(seg, 'yyyy-MM-dd');
    }
    let curr2 = new Date(inicio);
    while (curr2 <= fim) {
      const iso = chaveSemanaDe(curr2);
      const diaSemana = curr2.getDay();
      const mes = format(curr2, 'yyyy-MM');

      if (diasSemana.includes(diaSemana) && !estaEmAfastamento(curr2, afastamentos)) {
        if (!semanas[iso]) semanas[iso] = { minTotal: 0, mes };
        semanas[iso].minTotal += minLiquidosDia;
      }
      curr2 = addDays(curr2, 1);
    }

    // Reset HE from diario calculation for semanal mode
    if (padraoApuracao === 'semanal') {
      totalMinHE = 0;
      Object.values(distribuicaoMensal).forEach(m => { m.minutosHE = 0; });
    }

    Object.entries(semanas).forEach(([, s]) => {
      let heSemana = Math.max(0, s.minTotal - minContratualSemana);
      if (padraoApuracao === 'misto') {
        // Misto: semanal excess beyond daily excess already counted
        heSemana = Math.max(0, s.minTotal - minContratualSemana - (distribuicaoMensal[s.mes]?.minutosHE || 0));
      }
      if (heSemana > 0) {
        totalMinHE += heSemana;
        if (!distribuicaoMensal[s.mes]) distribuicaoMensal[s.mes] = { diasTrabalhados: 0, minutosHE: 0, minutosHN: 0 };
        distribuicaoMensal[s.mes].minutosHE += heSemana;
      }
    });
  }

  const distArray = Object.entries(distribuicaoMensal)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, d]) => ({
      mes,
      diasTrabalhados: d.diasTrabalhados,
      horasExtras: +(d.minutosHE / 60).toFixed(2),
      horasNoturnas: +(d.minutosHN / 60).toFixed(2),
    }));

  const numMeses = distArray.length || 1;

  return {
    totalHorasExtras: +(totalMinHE / 60).toFixed(2),
    totalHorasNoturnas: +(totalMinHN / 60).toFixed(2),
    distribuicaoMensal: distArray,
    numMeses,
  };
}

module.exports = { gerarCartaoPontoVirtual, calcularPeriodoJornada };
