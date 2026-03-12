'use strict';

/**
 * Cria uma entrada de auditoria para rastreio de cálculo
 */
function criarEntrada(codigo, nome, inputs, formula, resultado) {
  return {
    codigo,
    nome,
    timestamp: new Date().toISOString(),
    inputs,
    formula,
    resultado,
  };
}

/**
 * Acumula entradas de auditoria
 */
class Auditoria {
  constructor() {
    this.entradas = [];
  }

  registrar(codigo, nome, inputs, formula, resultado) {
    this.entradas.push(criarEntrada(codigo, nome, inputs, formula, resultado));
    return this;
  }

  toArray() {
    return this.entradas;
  }
}

module.exports = { Auditoria, criarEntrada };
