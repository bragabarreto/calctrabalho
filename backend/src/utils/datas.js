'use strict';

const {
  differenceInYears,
  differenceInMonths,
  differenceInDays,
  addYears,
  addDays,
  addMonths,
  subYears,
  startOfMonth,
  endOfMonth,
  getDate,
  getDaysInMonth,
  isSameMonth,
  isWeekend,
  format,
  parseISO,
  isValid,
  max: dateMax,
} = require('date-fns');

/**
 * Garante que o valor seja um objeto Date válido
 */
function toDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const d = parseISO(value);
    if (isValid(d)) return d;
  }
  throw new Error(`Data inválida: ${value}`);
}

/**
 * Equivalente ao DATEDIF "YM" do Excel:
 * meses restantes após subtrair os anos completos
 */
function datedifYM(start, end) {
  start = toDate(start);
  end = toDate(end);
  const anos = differenceInYears(end, start);
  const dataBaseAnos = addYears(start, anos);
  return differenceInMonths(end, dataBaseAnos);
}

/**
 * Equivalente ao DATEDIF "MD" do Excel:
 * dias restantes após subtrair anos e meses completos
 */
function datedifMD(start, end) {
  start = toDate(start);
  end = toDate(end);
  const anos = differenceInYears(end, start);
  const meses = differenceInMonths(end, addYears(start, anos));
  const base = addMonths(addYears(start, anos), meses);
  return differenceInDays(end, base);
}

/**
 * Calcula os cálculos temporais base da rescisão
 */
function calcularTemporais(dados, modalidade) {
  const dataAdmissao = toDate(dados.dataAdmissao);
  const dataDispensa = toDate(dados.dataDispensa);
  const dataAjuizamento = toDate(dados.dataAjuizamento);

  // Marco prescricional: max(admissão, ajuizamento - 5 anos)
  const cincoAnosAtras = subYears(dataAjuizamento, 5);
  const marcoPrescricional = dateMax([dataAdmissao, cincoAnosAtras]);

  // Anos completos até dispensa (para cálculo do aviso)
  const anosCompletos = differenceInYears(dataDispensa, dataAdmissao);
  let diasAvisoPrevio = Math.min(30 + anosCompletos * 3, 90);

  // Culpa recíproca: aviso prévio apurado pela metade dos dias (arredondar pra cima frações)
  if (modalidade === 'culpa_reciproca' && !dados.avisoPrevioTrabalhado) {
    diasAvisoPrevio = Math.ceil(diasAvisoPrevio / 2);
  }

  // Data de encerramento com aviso projetado (se não trabalhado)
  const dataEncerramentoComAviso = dados.avisoPrevioTrabalhado
    ? dataDispensa
    : addDays(dataDispensa, diasAvisoPrevio);

  // Lapso contratual sem aviso (base para 13º, FGTS período)
  const lapsoSemAviso = {
    anos: differenceInYears(dataDispensa, marcoPrescricional),
    meses: differenceInMonths(dataDispensa, marcoPrescricional),
    mesesRestantes: datedifYM(marcoPrescricional, dataDispensa),
    diasRestantes: datedifMD(marcoPrescricional, dataDispensa),
    dias: differenceInDays(dataDispensa, marcoPrescricional),
  };

  // Lapso contratual com aviso (base para férias proporcionais, FGTS todo contrato)
  const lapsoComAviso = {
    anos: differenceInYears(dataEncerramentoComAviso, marcoPrescricional),
    meses: differenceInMonths(dataEncerramentoComAviso, marcoPrescricional),
    mesesRestantes: datedifYM(marcoPrescricional, dataEncerramentoComAviso),
    diasRestantes: datedifMD(marcoPrescricional, dataEncerramentoComAviso),
    dias: differenceInDays(dataEncerramentoComAviso, marcoPrescricional),
  };

  // Para saldo salarial: dias trabalhados no último mês
  const inicioDerraderoMes = startOfMonth(dataDispensa);
  const diasUltimoMes = differenceInDays(dataDispensa, inicioDerraderoMes) + 1;
  const diasNoMes = getDaysInMonth(dataDispensa);

  // Para férias proporcionais: meses e dias do último período aquisitivo
  // O período aquisitivo conta a partir do aniversário do contrato
  const ultimoAniversario = encontrarUltimoAniversario(dataAdmissao, dataEncerramentoComAviso);
  const mesesUltimoAno = differenceInMonths(dataEncerramentoComAviso, ultimoAniversario);
  const diasUltimoAno = datedifMD(ultimoAniversario, dataEncerramentoComAviso);

  // Anos totais do contrato (para férias vencidas)
  const anosTotaisContrato = differenceInYears(dataDispensa, dataAdmissao);

  // Dias úteis no período imprescrito
  const diasUteis6d = calcularDiasUteis(marcoPrescricional, dataDispensa, 6);
  const diasUteis5d = calcularDiasUteis(marcoPrescricional, dataDispensa, 5);

  return {
    dataAdmissao,
    dataDispensa,
    dataAjuizamento,
    marcoPrescricional,
    anosCompletos,
    diasAvisoPrevio,
    dataEncerramentoComAviso,
    lapsoSemAviso,
    lapsoComAviso,
    diasUltimoMes,
    diasNoMes,
    ultimoAniversario,
    mesesUltimoAno,
    diasUltimoAno,
    anosTotaisContrato,
    diasUteis6d,
    diasUteis5d,
  };
}

/**
 * Encontra o último aniversário do contrato antes da data de encerramento
 */
function encontrarUltimoAniversario(dataAdmissao, dataEncerramento) {
  dataAdmissao = toDate(dataAdmissao);
  dataEncerramento = toDate(dataEncerramento);
  const anos = differenceInYears(dataEncerramento, dataAdmissao);
  return addYears(dataAdmissao, anos);
}

/**
 * Calcula dias úteis no período (6 dias = inclui sábado, 5 dias = seg-sex)
 */
function calcularDiasUteis(inicio, fim, diasSemana = 6) {
  inicio = toDate(inicio);
  fim = toDate(fim);
  let count = 0;
  let current = new Date(inicio);
  while (current <= fim) {
    const diaSemana = current.getDay(); // 0=dom, 6=sab
    if (diasSemana === 6) {
      if (diaSemana !== 0) count++; // exclui apenas domingo
    } else {
      if (diaSemana !== 0 && diaSemana !== 6) count++; // exclui sab e dom
    }
    current = addDays(current, 1);
  }
  return count;
}

/**
 * Calcula aviso prévio em dias (30 + 3/ano, max 90)
 */
function calcularAvisoPrevia_Dias(dataAdmissao, dataDispensa) {
  dataAdmissao = toDate(dataAdmissao);
  dataDispensa = toDate(dataDispensa);
  const anos = differenceInYears(dataDispensa, dataAdmissao);
  return Math.min(30 + anos * 3, 90);
}

/**
 * Formata data para exibição dd/MM/yyyy
 */
function formatarData(data) {
  return format(toDate(data), 'dd/MM/yyyy');
}

module.exports = {
  toDate,
  datedifYM,
  datedifMD,
  calcularTemporais,
  calcularDiasUteis,
  calcularAvisoPrevia_Dias,
  encontrarUltimoAniversario,
  formatarData,
  differenceInYears,
  differenceInMonths,
  differenceInDays,
  addDays,
  addMonths,
  addYears,
  startOfMonth,
  endOfMonth,
  getDate,
  getDaysInMonth,
  isSameMonth,
  format,
  parseISO,
};
