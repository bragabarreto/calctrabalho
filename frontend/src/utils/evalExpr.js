/**
 * Parser de descida recursiva para expressões matemáticas simples (+, -, *, /, parênteses).
 * Não usa eval nem Function — compatível com CSP restrito.
 *
 * Trata números no formato brasileiro (1.234,56) corretamente:
 *  - "1234,56"       → 1234.56
 *  - "1.234,56"      → 1234.56
 *  - "5000+1500"     → 6500
 *  - "1.234,56+2.000,00" → 3234.56
 *  - "(5000+1500)*0.15"  → 975
 */
export default function evalExpr(raw) {
  if (!raw || !String(raw).trim()) return 0;
  const str = String(raw).trim();

  const tokens = [];
  let i = 0;
  while (i < str.length) {
    if (/\s/.test(str[i])) { i++; continue; }

    // Acumular dígitos, pontos e vírgulas como um único token numérico
    if (/[\d.,]/.test(str[i])) {
      let num = '';
      while (i < str.length && /[\d.,]/.test(str[i])) num += str[i++];
      tokens.push({ t: 'n', v: normalizarNumero(num) });
    } else if (/[+\-*/()]/.test(str[i])) {
      tokens.push({ t: 'o', v: str[i++] });
    } else {
      // Caractere inesperado — tentar parseFloat do string todo
      return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    }
  }

  let pos = 0;
  const peek = () => (pos < tokens.length ? tokens[pos] : null);
  const consume = () => tokens[pos++];

  function expr() {
    let left = term();
    while (peek() && (peek().v === '+' || peek().v === '-')) {
      const op = consume().v;
      left = op === '+' ? left + term() : left - term();
    }
    return left;
  }
  function term() {
    let left = factor();
    while (peek() && (peek().v === '*' || peek().v === '/')) {
      const op = consume().v;
      const r = factor();
      left = op === '*' ? left * r : (r !== 0 ? left / r : 0);
    }
    return left;
  }
  function factor() {
    const t = peek();
    if (!t) return 0;
    if (t.v === '(') { consume(); const v = expr(); if (peek()?.v === ')') consume(); return v; }
    if (t.t === 'n') { consume(); return t.v; }
    if (t.v === '-') { consume(); return -factor(); }
    return 0;
  }

  try {
    const result = expr();
    if (isFinite(result)) return Math.round(result * 100) / 100;
  } catch (_) {}
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

/**
 * Normaliza string numérica brasileira para float JS.
 *  - Se contém '.' E ',' → formato brasileiro: remove pontos, troca vírgula por ponto
 *  - Se contém apenas ','  → troca por ponto (decimal)
 *  - Se contém apenas '.'  → mantém como decimal (formato inglês)
 */
function normalizarNumero(s) {
  const temPonto = s.includes('.');
  const temVirgula = s.includes(',');

  if (temPonto && temVirgula) {
    // Formato brasileiro: 1.234,56 → 1234.56
    return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (temVirgula) {
    // Vírgula como decimal: 1234,56 → 1234.56
    return parseFloat(s.replace(',', '.')) || 0;
  }
  // Somente ponto ou nenhum separador
  return parseFloat(s) || 0;
}
