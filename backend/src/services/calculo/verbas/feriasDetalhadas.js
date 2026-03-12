'use strict';

const {
  toDate,
  addYears,
  addDays,
  differenceInYears,
  differenceInMonths,
  differenceInDays,
  datedifMD,
  format,
} = require('../../../utils/datas');

/**
 * Calcula aviso prévio indenizado em dias (30 + 3/ano, max 90)
 */
function calcularDiasAviso(dataAdmissao, dataDispensa, avisoPrevioTrabalhado) {
  if (avisoPrevioTrabalhado) return 0;
  const anos = differenceInYears(toDate(dataDispensa), toDate(dataAdmissao));
  return Math.min(30 + anos * 3, 90);
}

/**
 * Calcula todos os períodos aquisitivos de férias com seus dados:
 * - período aquisitivo (início/fim)
 * - período concessivo (início/fim = aquisitivo + 1 ano)
 * - avos do período proporcional (último período incompleto)
 * - se está vencido (período concessivo já passou até a data de dispensa)
 *
 * @param {string} dataAdmissao
 * @param {string} dataDispensa
 * @param {boolean} avisoPrevioTrabalhado
 * @returns {Array} periodos
 */
function calcularPeriodosAquisitivosFerias(dataAdmissao, dataDispensa, avisoPrevioTrabalhado) {
  const admissao = toDate(dataAdmissao);
  const dispensa = toDate(dataDispensa);

  const diasAviso = calcularDiasAviso(dataAdmissao, dataDispensa, avisoPrevioTrabalhado);
  // Data de encerramento projetada com aviso
  const dataEncerramento = diasAviso > 0 ? addDays(dispensa, diasAviso) : dispensa;

  const anosCompletos = differenceInYears(dataEncerramento, admissao);
  const periodos = [];

  // Períodos integrais (completos)
  for (let i = 0; i < anosCompletos; i++) {
    const inicioAquisitivo = addYears(admissao, i);
    const fimAquisitivo = addDays(addYears(admissao, i + 1), -1);
    const inicioConcessivo = addYears(admissao, i + 1);
    const fimConcessivo = addDays(addYears(admissao, i + 2), -1);

    // Vencidas = período concessivo encerrou antes/na data de dispensa
    const vencidas = fimConcessivo < dispensa;

    periodos.push({
      numero: i + 1,
      tipo: 'integral',
      inicioAquisitivo: format(inicioAquisitivo, 'yyyy-MM-dd'),
      fimAquisitivo: format(fimAquisitivo, 'yyyy-MM-dd'),
      inicioConcessivo: format(inicioConcessivo, 'yyyy-MM-dd'),
      fimConcessivo: format(fimConcessivo, 'yyyy-MM-dd'),
      avos: 12,
      vencidas, // período concessivo expirado = dobro se não gozadas
      status: 'pendente', // será preenchido pelo usuário: 'pagas' | 'gozadas' | 'devidas'
      dataGozo: null,
      diasGozados: null,
    });
  }

  // Período proporcional (último período incompleto)
  const inicioUltimoPeriodo = addYears(admissao, anosCompletos);
  const mesesProporcional = differenceInMonths(dataEncerramento, inicioUltimoPeriodo);
  const diasProporcional = datedifMD(inicioUltimoPeriodo, dataEncerramento);
  const avosEfetivos = diasProporcional >= 15 ? mesesProporcional + 1 : mesesProporcional;

  if (avosEfetivos > 0) {
    const fimAquisitivoProp = addDays(addYears(admissao, anosCompletos + 1), -1);
    const inicioConcessivoProp = addYears(admissao, anosCompletos + 1);
    const fimConcessivoProp = addDays(addYears(admissao, anosCompletos + 2), -1);

    periodos.push({
      numero: anosCompletos + 1,
      tipo: 'proporcional',
      inicioAquisitivo: format(inicioUltimoPeriodo, 'yyyy-MM-dd'),
      fimAquisitivo: format(fimAquisitivoProp, 'yyyy-MM-dd'),
      inicioConcessivo: format(inicioConcessivoProp, 'yyyy-MM-dd'),
      fimConcessivo: format(fimConcessivoProp, 'yyyy-MM-dd'),
      avos: avosEfetivos,
      meses: mesesProporcional,
      diasRestantes: diasProporcional,
      vencidas: false, // proporcionais nunca são dobradas (período concessivo nem iniciou)
      status: 'devidas', // proporcionais são sempre devidas
      dataGozo: null,
      diasGozados: null,
    });
  }

  return periodos;
}

/**
 * Calcula todos os períodos de 13º salário com avos.
 * Retorna um por ano do contrato + proporcional do ano corrente.
 */
function calcularPeriodosDecimoTerceiro(dataAdmissao, dataDispensa, avisoPrevioTrabalhado) {
  const admissao = toDate(dataAdmissao);
  const dispensa = toDate(dataDispensa);

  const diasAviso = calcularDiasAviso(dataAdmissao, dataDispensa, avisoPrevioTrabalhado);
  // 13º proporcional NÃO projeta aviso para período — só férias projeta
  // Mas usamos dispensa + 0 para 13º proporcional
  const anosCompletos = differenceInYears(dispensa, admissao);

  const periodos = [];

  // Anos integrais (1 por ano civil do contrato)
  for (let i = 0; i < anosCompletos; i++) {
    const anoRef = admissao.getFullYear() + i;
    periodos.push({
      numero: i + 1,
      anoReferencia: anoRef,
      tipo: 'integral',
      avos: 12,
      status: 'pendente', // 'pago' | 'devido'
    });
  }

  // Proporcional do ano corrente (ano da dispensa)
  const inicioAnoProporcional = new Date(dispensa.getFullYear(), 0, 1); // 01/01 do ano da dispensa
  // Para 13º, conta meses de jan até o mês da dispensa
  const meses = dispensa.getMonth(); // 0-based
  const diasNoMes = dispensa.getDate();
  const avos = diasNoMes >= 15 ? meses + 1 : meses;

  if (avos > 0) {
    periodos.push({
      numero: anosCompletos + 1,
      anoReferencia: dispensa.getFullYear(),
      tipo: 'proporcional',
      avos,
      meses,
      diasRestantes: diasNoMes,
      status: 'devido', // proporcional é sempre devido
    });
  }

  return periodos;
}

module.exports = { calcularPeriodosAquisitivosFerias, calcularPeriodosDecimoTerceiro };
