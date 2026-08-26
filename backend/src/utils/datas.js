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

const UM_DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Garante que o valor seja um objeto Date válido, ancorado ao meio-dia local.
 *
 * Datas de contrato chegam como 'YYYY-MM-DD'. Tanto `new Date('2025-06-04')`
 * quanto `Joi.date().iso()` produzem meia-noite UTC — que, em fuso negativo
 * (todo o Brasil), é 21h do dia ANTERIOR no relógio local. Como date-fns
 * trabalha com os campos locais, todo o calendário passava a usar o dia errado
 * (ex.: saldo salarial apurava 20 dias em vez de 21). Ancorar no meio-dia local
 * elimina o deslocamento em qualquer fuso.
 */
function toDate(value) {
  if (value instanceof Date) {
    if (!isValid(value)) throw new Error(`Data inválida: ${value}`);
    // Meia-noite UTC exata = data-only convertida sem fuso: reconstrói pelos campos UTC.
    if (value.getTime() % UM_DIA_MS === 0) {
      return new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 12, 0, 0, 0);
    }
    return value;
  }
  if (typeof value === 'string') {
    const texto = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      const d = new Date(`${texto}T12:00:00`);
      if (isValid(d)) return d;
    }
    const d = parseISO(texto);
    if (isValid(d)) return d;
  }
  throw new Error(`Data inválida: ${value}`);
}

/**
 * Formata uma data como 'YYYY-MM-DD' usando os campos locais.
 * Substitui `toISOString().split('T')[0]`, que reintroduz o deslocamento de fuso.
 */
function toISODate(value) {
  const d = toDate(value);
  return format(d, 'yyyy-MM-dd');
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
 * Conta os dias corridos de um intervalo, incluindo os dois extremos.
 * (04/08 a 20/08 = 17 dias, e não 16.)
 */
function diasInclusivos(inicio, fim) {
  return differenceInDays(toDate(fim), toDate(inicio)) + 1;
}

/**
 * Avos de 13º salário — art. 1º, §§ 1º e 2º, da Lei 4.090/62.
 *
 * O 13º é apurado por MÊS CIVIL do ano de referência: cada mês com 15 dias ou
 * mais de tempo de serviço vale 1/12. Não se conta a partir do aniversário do
 * contrato — contar assim distorce todo contrato que atravessa o ano civil.
 */
function contarAvos13(inicio, fim) {
  inicio = toDate(inicio);
  fim = toDate(fim);
  if (fim < inicio) return { avos: 0, detalhe: [] };

  const detalhe = [];
  let avos = 0;
  let cursor = startOfMonth(inicio);

  while (cursor <= fim) {
    const primeiroDia = cursor < inicio ? inicio : cursor;
    const fimDoMes = endOfMonth(cursor);
    const ultimoDia = fimDoMes > fim ? fim : fimDoMes;
    const dias = diasInclusivos(primeiroDia, ultimoDia);
    const conta = dias >= 15;
    if (conta) avos++;
    detalhe.push({ competencia: format(cursor, 'MM/yyyy'), dias, conta });
    cursor = addMonths(cursor, 1);
  }

  return { avos: Math.min(avos, 12), detalhe };
}

/**
 * Avos de férias proporcionais — art. 146, parágrafo único, CLT.
 *
 * Conta os meses do período aquisitivo (a partir do aniversário do contrato);
 * a fração final igual ou superior a 15 dias vale mês inteiro. A contagem de
 * dias é inclusiva nos dois extremos.
 */
function contarAvosFerias(inicioAquisitivo, fim) {
  inicioAquisitivo = toDate(inicioAquisitivo);
  fim = toDate(fim);
  if (fim < inicioAquisitivo) return { avos: 0, mesesCompletos: 0, diasFracao: 0 };

  const mesesCompletos = differenceInMonths(fim, inicioAquisitivo);
  const inicioFracao = addMonths(inicioAquisitivo, mesesCompletos);
  // A fração começa no dia seguinte ao término do último mês completo.
  const diasFracao = Math.max(0, diasInclusivos(inicioFracao, fim) - 1);
  const avos = Math.min(mesesCompletos + (diasFracao >= 15 ? 1 : 0), 12);

  return { avos, mesesCompletos, diasFracao };
}

/**
 * Meses de remuneração de um período — base do FGTS (art. 15 da Lei 8.036/90).
 *
 * Mês civil integralmente trabalhado vale 1; mês parcial vale dias/30
 * (mesmo critério do saldo de salário, art. 64 CLT). Truncar para meses
 * inteiros, como se fazia antes, ignorava os meses de admissão e de dispensa.
 */
function contarMesesRemunerados(inicio, fim) {
  inicio = toDate(inicio);
  fim = toDate(fim);
  if (fim < inicio) return 0;

  let total = 0;
  let cursor = startOfMonth(inicio);

  while (cursor <= fim) {
    const fimDoMes = endOfMonth(cursor);
    const primeiroDia = cursor < inicio ? inicio : cursor;
    const ultimoDia = fimDoMes > fim ? fim : fimDoMes;
    const dias = diasInclusivos(primeiroDia, ultimoDia);
    total += dias >= getDaysInMonth(cursor) ? 1 : dias / 30;
    cursor = addMonths(cursor, 1);
  }

  return Math.round(total * 10000) / 10000;
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

  // ---- AVOS DE FÉRIAS PROPORCIONAIS (art. 146, § único, CLT) ----
  const feriasInfo = contarAvosFerias(ultimoAniversario, dataEncerramentoComAviso);
  const avosFerias = feriasInfo.avos;

  // ---- AVOS DE 13º PROPORCIONAL (Lei 4.090/62) ----
  // Contagem por mês civil do ano da rescisão, com projeção do aviso indenizado
  // (Súmula 305 e OJ 82 da SDI-1 do TST).
  const anoRescisao = dataDispensa.getFullYear();
  const inicio13 = dateMax([marcoPrescricional, new Date(anoRescisao, 0, 1, 12, 0, 0, 0)]);
  const fimAnoRescisao = new Date(anoRescisao, 11, 31, 12, 0, 0, 0);
  const fim13 = dataEncerramentoComAviso > fimAnoRescisao ? fimAnoRescisao : dataEncerramentoComAviso;
  const avos13Info = contarAvos13(inicio13, fim13);

  // Quando a projeção do aviso ultrapassa 31/12, nasce um 13º proporcional
  // do ano seguinte, devido em separado.
  const avos13AnoSeguinteInfo = dataEncerramentoComAviso > fimAnoRescisao
    ? contarAvos13(new Date(anoRescisao + 1, 0, 1, 12, 0, 0, 0), dataEncerramentoComAviso)
    : { avos: 0, detalhe: [] };

  const avos13 = avos13Info.avos + avos13AnoSeguinteInfo.avos;

  // ---- MESES REMUNERADOS (base do FGTS) ----
  // Meses efetivamente remunerados no período imprescrito + projeção do aviso.
  const mesesRemunerados = Math.round(
    (contarMesesRemunerados(marcoPrescricional, dataDispensa) +
      (dados.avisoPrevioTrabalhado ? 0 : diasAvisoPrevio / 30)) * 10000
  ) / 10000;

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
    avosFerias,
    avosFeriasDetalhe: feriasInfo,
    avos13,
    avos13Detalhe: avos13Info.detalhe,
    avos13AnoSeguinte: avos13AnoSeguinteInfo.avos,
    avos13AnoSeguinteDetalhe: avos13AnoSeguinteInfo.detalhe,
    mesesRemunerados,
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
  toISODate,
  datedifYM,
  datedifMD,
  diasInclusivos,
  contarAvos13,
  contarAvosFerias,
  contarMesesRemunerados,
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
