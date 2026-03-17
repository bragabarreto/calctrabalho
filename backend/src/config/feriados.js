'use strict';

/**
 * Feriados Nacionais Brasileiros
 * Fixos + Móveis (baseados na data da Páscoa)
 */

/**
 * Algoritmo de Gauss/Meeus para calcular a data da Páscoa (calendário gregoriano)
 * @param {number} ano
 * @returns {{ mes: number, dia: number }} mês (1-12) e dia
 */
function calcularPascoa(ano) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return { mes, dia };
}

/**
 * Adiciona dias a uma data representada por { ano, mes, dia }
 */
function adicionarDias({ ano, mes, dia }, days) {
  const d = new Date(ano, mes - 1, dia + days);
  return { ano: d.getFullYear(), mes: d.getMonth() + 1, dia: d.getDate() };
}

/**
 * Formata { ano, mes, dia } como 'YYYY-MM-DD'
 */
function fmt({ ano, mes, dia }) {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/**
 * Retorna a lista de feriados nacionais para um dado ano
 * @param {number} ano
 * @returns {string[]} array de datas 'YYYY-MM-DD'
 */
function getFeriadosNacionais(ano) {
  const pascoa = { ...calcularPascoa(ano), ano };

  return [
    // Fixos
    `${ano}-01-01`, // Confraternização Universal
    `${ano}-04-21`, // Tiradentes
    `${ano}-05-01`, // Dia do Trabalho
    `${ano}-09-07`, // Independência do Brasil
    `${ano}-10-12`, // Nossa Sra. Aparecida
    `${ano}-11-02`, // Finados
    `${ano}-11-15`, // Proclamação da República
    `${ano}-12-25`, // Natal

    // Móveis (relativos à Páscoa)
    fmt(adicionarDias(pascoa, -47)), // Carnaval (2ª-feira, -47d antes Páscoa)
    fmt(adicionarDias(pascoa, -46)), // Carnaval (3ª-feira, -46d)
    fmt(adicionarDias(pascoa, -2)),  // Sexta-Feira Santa (-2d)
    fmt(pascoa),                      // Páscoa
    fmt(adicionarDias(pascoa, +60)), // Corpus Christi (+60d)
  ];
}

/**
 * Verifica se uma data (string 'YYYY-MM-DD') é feriado nacional ou adicional
 * @param {string} dataStr - 'YYYY-MM-DD'
 * @param {string[]} [feriadosAdicionais] - datas extras informadas pelo usuário
 * @returns {boolean}
 */
function ehFeriado(dataStr, feriadosAdicionais = []) {
  const ano = parseInt(dataStr.slice(0, 4), 10);
  if (!ano) return false;

  const nacionais = getFeriadosNacionais(ano);
  if (nacionais.includes(dataStr)) return true;
  if (feriadosAdicionais.includes(dataStr)) return true;
  return false;
}

module.exports = { getFeriadosNacionais, ehFeriado, calcularPascoa };
