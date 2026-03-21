'use strict';

const {
  toDate, addDays, differenceInDays, format, parseISO, isValid,
} = require('../../../utils/datas');
const { ehFeriado } = require('../../../config/feriados');

/**
 * Converte string "HH:MM" para minutos desde meia-noite.
 */
function toMinutos(hhmm) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

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
 * Verifica se uma data cai dentro de algum período de férias.
 */
function estaEmFerias(data, ferias) {
  for (const f of (ferias || [])) {
    const ini = toDate(f.inicio);
    const fim = toDate(f.fim);
    if (data >= ini && data <= fim) return true;
  }
  return false;
}

/**
 * Calcula o mínimo de intervalo legal em minutos baseado na jornada bruta diária.
 * CLT art. 71:
 *   - Jornada > 6h: mínimo 60min
 *   - 4h < jornada ≤ 6h: mínimo 15min
 *   - ≤ 4h: sem obrigação
 */
function minIntervaloLegal(minBrutos) {
  if (minBrutos > 360) return 60;  // > 6h
  if (minBrutos > 240) return 15;  // > 4h e ≤ 6h
  return 0;
}

/**
 * Calcula minutos reais dentro do período noturno (22h–05h + prorrogação art. 73 §5 CLT).
 * Retorna os minutos REAIS trabalhados no período noturno (não convertidos).
 * A conversão 52min30s → 1h é aplicada separadamente para obter os minutos EFETIVOS.
 *
 * @param {number} entradaMin  - minutos de entrada desde meia-noite
 * @param {number} saidaMin    - minutos de saída desde meia-noite (pode ultrapassar 1440)
 * @param {boolean} prorrogacao - se true, todo o trecho após 5h de uma jornada iniciada no
 *                               período noturno também é tratado como hora noturna (art. 73 §5 CLT)
 * @returns {number} minutos reais noturnos (brutos — aplique × 60/52.5 para obter efetivos)
 */
function calcularMinutosNoturnos(entradaMin, saidaMin, prorrogacao) {
  const NOTURNO_INICIO = 22 * 60; // 1320
  const NOTURNO_FIM = 5 * 60;     // 300 (do dia seguinte = 300 + 1440 = 1740 se após meia-noite)

  let minNoturnos = 0;

  // Normaliza saída: se saída < entrada, assume que atravessou meia-noite
  const saidaEfetiva = saidaMin < entradaMin ? saidaMin + 1440 : saidaMin;

  // Início do período noturno legal (22h ou 22h do dia = 1320)
  // Fim do período noturno (5h do dia seguinte = 300 + 1440 = 1740 em minutos desde meia-noite do dia anterior)
  const noturnoDe = NOTURNO_INICIO;           // 1320
  const noturnoAte = NOTURNO_FIM + 1440;      // 1740

  // Sem prorrogação: período noturno é 22h–05h
  // Com prorrogação: período noturno se estende até o fim da jornada se começou no período noturno
  let noturnoFimEfetivo = noturnoAte;
  if (prorrogacao) {
    // Se a jornada começa no período noturno (antes das 5h ou depois das 22h)
    const entradaNoturna = entradaMin >= NOTURNO_INICIO || entradaMin < NOTURNO_FIM;
    if (entradaNoturna) {
      noturnoFimEfetivo = Math.max(noturnoAte, saidaEfetiva);
    }
  }

  // Interseção entre [entradaMin, saidaEfetiva] e [noturnoDe, noturnoFimEfetivo]
  // Considera também o período antes da meia-noite e depois da meia-noite
  // Período noturno no mesmo dia: [1320, 1440] = 22h–24h
  const segmentos = [
    { de: noturnoDe, ate: Math.min(1440, noturnoFimEfetivo) }, // 22h até meia-noite (ou fim prorrogação)
    { de: 0, ate: Math.min(NOTURNO_FIM, noturnoFimEfetivo - 1440) }, // 00h–05h (ajustado)
  ];

  // Entrada normalizada para comparação
  const entMin = entradaMin;
  const saiMin = saidaEfetiva;

  // Para o segmento 22h–meia-noite
  const seg1De = noturnoDe; // 1320
  const seg1Ate = 1440;
  const overlap1Start = Math.max(entMin, seg1De);
  const overlap1End = Math.min(saiMin, seg1Ate);
  if (overlap1End > overlap1Start) minNoturnos += overlap1End - overlap1Start;

  // Para o segmento meia-noite–05h (em termos de minutos desde meia-noite do dia anterior)
  // = 1440 até 1740 para saidaEfetiva (que já pode ter ultrapassado meia-noite)
  const seg2De = 1440; // meia-noite = 0h mas em escala estendida
  const seg2Ate = noturnoFimEfetivo; // 1740 ou mais se prorrogação
  const overlap2Start = Math.max(entMin, seg2De);
  const overlap2End = Math.min(saiMin, seg2Ate);
  if (overlap2End > overlap2Start) minNoturnos += overlap2End - overlap2Start;

  // Normalização: hora noturna = 52min30s → fator = 60/52.5
  // Mas aqui retornamos minutos reais (o fator de normalização é aplicado no cálculo do valor)
  return Math.max(0, minNoturnos);
}

/**
 * Gera o array completo de dias para um período de jornada.
 * Retorna cada dia com todos os campos necessários para cálculo de qualquer verba de duração do trabalho.
 *
 * @param {Object} periodo   - Configuração do período (campos do jornadaPeriodos)
 * @param {string} dataAdm   - dataAdmissao do contrato (fallback quando periodo.dataInicio = null)
 * @param {string} dataDisp  - dataDispensa do contrato (fallback quando periodo.dataFim = null)
 * @param {string[]} feriadosAdicionais - datas extras de feriados (YYYY-MM-DD)
 * @returns {Array} array de objetos por dia
 */
function gerarDiasPeriodo(periodo, dataAdm, dataDisp, feriadosAdicionais = []) {
  const inicio = toDate(periodo.dataInicio || dataAdm);
  const fim = toDate(periodo.dataFim || dataDisp);

  const {
    horaEntrada,
    horaSaida,
    intervaloMinutos = 60,
    diasSemana = [1, 2, 3, 4, 5],
    divisorJornada = 220,
    prorrogacaoNoturna = false,
    ferias: feriasPeriodo = [],
  } = periodo;

  const afastamentos = periodo.afastamentos || [];

  // Jornada contratual diária em minutos
  const horasSemanais = divisorJornada / 5;
  const minContratualDia = (horasSemanais * 60) / Math.max(1, diasSemana.length);

  const entradaMin = toMinutos(horaEntrada);
  const saidaMin = toMinutos(horaSaida);
  const minBrutosDia = saidaMin >= entradaMin
    ? saidaMin - entradaMin
    : (1440 - entradaMin) + saidaMin; // atravessa meia-noite
  const minLiquidosDia = Math.max(0, minBrutosDia - (intervaloMinutos || 0));
  const intervaloMinLegal = minIntervaloLegal(minBrutosDia);
  const intervaloDeficit = Math.max(0, intervaloMinLegal - (intervaloMinutos || 0));

  // Minutos noturnos reais por dia
  const minNocturnos = (horaEntrada && horaSaida)
    ? calcularMinutosNoturnos(entradaMin, saidaMin >= entradaMin ? saidaMin : saidaMin + 1440, prorrogacaoNoturna)
    : 0;

  // Redução da hora noturna (CLT art. 73 §1°): 52min30s = 1h contratual
  // minutos noturnos líquidos (cap no total líquido — o intervalo não é reduzido)
  const minNocturnosLiq = Math.min(minNocturnos, minLiquidosDia);
  // Minutos efetivos: trecho diurno permanece 1:1; trecho noturno é multiplicado por 60/52.5
  const minEfetivosDia = (minLiquidosDia - minNocturnosLiq) + minNocturnosLiq * (60 / 52.5);

  const dias = [];
  let current = new Date(inicio);

  while (current <= fim) {
    const dataStr = format(current, 'yyyy-MM-dd');
    const diaSemana = current.getDay(); // 0=Dom..6=Sab
    const afastado = estaEmAfastamento(current, afastamentos);
    const emFerias = estaEmFerias(current, feriasPeriodo);
    const eFeriado = ehFeriado(dataStr, feriadosAdicionais);
    const ehDiaTrabalhado = diasSemana.includes(diaSemana) && !afastado && !emFerias;
    // RSR = dia fora da escala semanal mas que foi trabalhado (detectável externamente)
    // No cartão virtual, marcamos ehRSR como dia que NÃO está na escala semanal regular
    const ehRSR = !diasSemana.includes(diaSemana) && !afastado && !emFerias;

    dias.push({
      data: dataStr,
      mes: format(current, 'yyyy-MM'),
      diaSemana,
      afastado,
      ferias: emFerias,
      trabalhado: ehDiaTrabalhado,
      ehFeriado: eFeriado,
      ehRSR,
      minEntrada: entradaMin,
      minSaida: saidaMin,
      minBrutosDia: ehDiaTrabalhado ? minBrutosDia : 0,
      minLiquidosDia: ehDiaTrabalhado ? minLiquidosDia : 0,
      minEfetivosDia: ehDiaTrabalhado ? minEfetivosDia : 0,
      minContratualDia: Math.round(minContratualDia),
      // minExtras usa minutos EFETIVOS (com redução noturna de 52min30s → CLT art. 73 §1°)
      minExtras: ehDiaTrabalhado ? Math.max(0, minEfetivosDia - minContratualDia) : 0,
      intervaloMinutos: ehDiaTrabalhado ? (intervaloMinutos || 0) : 0,
      minIntervaloMinimo: ehDiaTrabalhado ? intervaloMinLegal : 0,
      minIntervaloDeficit: ehDiaTrabalhado ? intervaloDeficit : 0,
      minNoturnosDia: ehDiaTrabalhado ? minNocturnos : 0,
    });

    current = addDays(current, 1);
  }

  return dias;
}

/**
 * Calcula horas extras de um período de jornada com suporte a padrões diário/semanal/misto/12x36.
 * Agora retorna também `dias` (array completo) quando modoEntrada = 'cartao_ponto'.
 *
 * @param {Object} periodo   - Configuração do período (campos do jornadaPeriodos)
 * @param {string} dataAdm   - dataAdmissao do contrato (fallback quando periodo.dataInicio = null)
 * @param {string} dataDisp  - dataDispensa do contrato (fallback quando periodo.dataFim = null)
 * @param {string[]} feriadosAdicionais
 * @returns {Object} { totalHorasExtras, totalHorasNoturnas, distribuicaoMensal, numMeses, dias }
 */
function calcularPeriodoJornada(periodo, dataAdm, dataDisp, feriadosAdicionais = []) {
  const inicio = toDate(periodo.dataInicio || dataAdm);
  const fim = toDate(periodo.dataFim || dataDisp);
  const padraoApuracao = periodo.padraoApuracao || 'diario';
  const divisor = periodo.divisorJornada || 220;
  const afastamentos = periodo.afastamentos || [];

  // Jornada contratual derivada do divisor
  const horasSemanais = divisor / 5;
  const diasTrabalhadosSemana = (periodo.diasSemana || [1, 2, 3, 4, 5]).length;
  const horasContratualDiaria = horasSemanais / Math.max(1, diasTrabalhadosSemana);
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
      meses.forEach(mes => {
        const he = +(heSemana * 4.33).toFixed(2);
        const hn = +(hnDia * 21.75).toFixed(2);
        heTotal += he;
        hnTotal += hn;
        distArray.push({ mes, horasExtras: he, horasNoturnas: hn });
      });
    } else if (padraoApuracao === '12x36') {
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
      dias: [], // modo médio não tem dia a dia
    };
  }

  // ── Modo cartão de ponto: calcula dia a dia ──────────────────────────────

  const dias = gerarDiasPeriodo(periodo, dataAdm, dataDisp, feriadosAdicionais);

  const {
    horaEntrada,
    horaSaida,
    intervaloMinutos = 60,
    diasSemana = [1, 2, 3, 4, 5],
  } = periodo;

  const entradaMin = toMinutos(horaEntrada);
  const saidaMin = toMinutos(horaSaida);
  const minBrutos = saidaMin >= entradaMin ? saidaMin - entradaMin : (1440 - entradaMin) + saidaMin;
  const minLiquidosDia = Math.max(0, minBrutos - (intervaloMinutos || 0));
  const minContratualDia = horasContratualDiaria * 60;

  // Minutos efetivos por dia considerando a redução da hora noturna (CLT art. 73 §1°)
  const minNoctPeriodo = (horaEntrada && horaSaida)
    ? calcularMinutosNoturnos(entradaMin, saidaMin >= entradaMin ? saidaMin : saidaMin + 1440, periodo.prorrogacaoNoturna || false)
    : 0;
  const minNoctLiqPeriodo = Math.min(minNoctPeriodo, minLiquidosDia);
  const minEfetivosPerDia = (minLiquidosDia - minNoctLiqPeriodo) + minNoctLiqPeriodo * (60 / 52.5);

  let totalMinHE = 0;
  let totalMinHN = 0;
  const distribuicaoMensal = {};

  for (const d of dias) {
    if (!d.trabalhado) continue;

    const mes = d.mes;
    if (!distribuicaoMensal[mes]) distribuicaoMensal[mes] = { diasTrabalhados: 0, minutosHE: 0, minutosHN: 0 };
    distribuicaoMensal[mes].diasTrabalhados++;
    distribuicaoMensal[mes].minutosHN += d.minNoturnosDia;
    totalMinHN += d.minNoturnosDia;

    let minHE = 0;
    if (padraoApuracao === 'diario' || padraoApuracao === 'misto') {
      minHE = d.minExtras;
    } else if (padraoApuracao === '12x36') {
      minHE = Math.max(0, d.minLiquidosDia - horasJornadaPadrao12x36 * 60);
    }
    // semanal: calculado após loop

    if (padraoApuracao !== 'semanal') {
      totalMinHE += minHE;
      distribuicaoMensal[mes].minutosHE += minHE;
    }
  }

  // Para padrão semanal ou misto: calcular HE semanal acumulando por semana
  if (padraoApuracao === 'semanal' || padraoApuracao === 'misto') {
    const minContratualSemana = horasSemanais * 60;
    const semanas = {};

    function chaveSemanaDe(d) {
      const dayOfWeek = d.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const seg = new Date(d);
      seg.setDate(seg.getDate() + diff);
      return format(seg, 'yyyy-MM-dd');
    }

    let curr2 = new Date(inicio);
    while (curr2 <= fim) {
      const iso = chaveSemanaDe(curr2);
      const diaSemana = curr2.getDay();
      const mes = format(curr2, 'yyyy-MM');
      const afastado = estaEmAfastamento(curr2, afastamentos);

      if (diasSemana.includes(diaSemana) && !afastado) {
        if (!semanas[iso]) semanas[iso] = { minTotal: 0, mes };
        // Usa minutos efetivos (com redução noturna) para comparar com limite semanal
        semanas[iso].minTotal += minEfetivosPerDia;
      }
      curr2 = addDays(curr2, 1);
    }

    if (padraoApuracao === 'semanal') {
      totalMinHE = 0;
      Object.values(distribuicaoMensal).forEach(m => { m.minutosHE = 0; });
    }

    Object.entries(semanas).forEach(([, s]) => {
      let heSemana = Math.max(0, s.minTotal - minContratualSemana);
      if (padraoApuracao === 'misto') {
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
    dias,
  };
}

/**
 * Consolida os dias de todos os períodos de jornada no modo cartão em um único array,
 * ordenado por data. Usado pelo engine para passar para múltiplos módulos de cálculo.
 *
 * @param {Object} dados - dados completos do contrato
 * @returns {Array|null} array consolidado de dias, ou null se nenhum período usa cartão
 */
function gerarDiasCartao(dados) {
  const periodos = dados.jornadaPeriodos || [];
  const feriadosAdicionais = dados.feriadosAdicionais || [];

  const periodoCartao = periodos.filter(p => p.modoEntrada !== 'medio');
  if (!periodoCartao.length) return null;

  const todosDias = [];
  for (const p of periodoCartao) {
    const result = calcularPeriodoJornada(p, dados.dataAdmissao, dados.dataDispensa, feriadosAdicionais);
    todosDias.push(...result.dias);
  }

  // Ordenar por data e desduplicar (em caso de períodos sobrepostos)
  todosDias.sort((a, b) => a.data.localeCompare(b.data));
  const seen = new Set();
  return todosDias.filter(d => {
    if (seen.has(d.data)) return false;
    seen.add(d.data);
    return true;
  });
}

/**
 * Wrapper compatível com a rota POST /api/calculos/cartao-ponto.
 * Constrói um objeto de período a partir dos parâmetros da rota e chama calcularPeriodoJornada.
 */
function gerarCartaoPontoVirtual(jornadaDefinida, dataInicio, dataFim, afastamentos, divisorJornada) {
  const periodo = {
    modoEntrada: 'cartao_ponto',
    dataInicio: dataInicio || '',
    dataFim: dataFim || '',
    horaEntrada: jornadaDefinida.horaEntrada,
    horaSaida: jornadaDefinida.horaSaida,
    intervaloMinutos: jornadaDefinida.intervaloMinutos ?? 60,
    diasSemana: jornadaDefinida.diasSemana || [1, 2, 3, 4, 5],
    padraoApuracao: jornadaDefinida.padraoApuracao || 'diario',
    horasJornadaPadrao12x36: jornadaDefinida.horasJornadaPadrao12x36 || 12,
    prorrogacaoNoturna: jornadaDefinida.prorrogacaoNoturna || false,
    divisorJornada: divisorJornada || 220,
    afastamentos: afastamentos || [],
  };
  return calcularPeriodoJornada(periodo, dataInicio, dataFim, []);
}

module.exports = { gerarDiasPeriodo, calcularPeriodoJornada, gerarDiasCartao, gerarCartaoPontoVirtual };
