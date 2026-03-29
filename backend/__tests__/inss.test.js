'use strict';

// Mock the database module to prevent actual DB connections in tests
jest.mock('../src/config/database', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));

const { calcularINSS, calcularINSSEmpregador, calcularIR_RRA } = require('../src/services/calculo/verbas/inss');

describe('INSS Tabela Progressiva 2025', () => {
  test('salario abaixo da 1a faixa: 7.5%', async () => {
    // 1518 * 0.075 = 113.85
    const result = await calcularINSS(1518.00);
    expect(result).toBeCloseTo(113.85, 2);
  });

  test('salario na 2a faixa: progressivo', async () => {
    // Faixa 1: 1518 * 0.075 = 113.85
    // Faixa 2: (2793.88 - 1518) * 0.09 = 1275.88 * 0.09 = 114.83
    // Total = 228.68
    const result = await calcularINSS(2793.88);
    expect(result).toBeCloseTo(228.68, 1);
  });

  test('salario na 3a faixa: progressivo', async () => {
    // Faixa 1: 1518 * 0.075 = 113.85
    // Faixa 2: (2793.88 - 1518) * 0.09 = 114.83
    // Faixa 3: (4190.83 - 2793.88) * 0.12 = 1396.95 * 0.12 = 167.63
    // Total = 396.31
    const result = await calcularINSS(4190.83);
    expect(result).toBeCloseTo(396.31, 1);
  });

  test('salario acima do teto: contribuicao maxima ~908.86', async () => {
    const result = await calcularINSS(10000);
    expect(result).toBeCloseTo(908.86, 1);
  });

  test('salario zero', async () => {
    const result = await calcularINSS(0);
    expect(result).toBe(0);
  });

  test('salario exatamente no teto 8157.41', async () => {
    const result = await calcularINSS(8157.41);
    expect(result).toBeCloseTo(908.86, 1);
  });
});

describe('INSS Empregador', () => {
  test('contribuicao patronal 20%', () => {
    const result = calcularINSSEmpregador(5000);
    expect(result).toBe(1000);
  });

  test('base zero', () => {
    const result = calcularINSSEmpregador(0);
    expect(result).toBe(0);
  });
});

describe('IR RRA (art. 12-A Lei 7.713/88)', () => {
  test('base zero retorna IR 0', () => {
    const result = calcularIR_RRA(0, 12);
    expect(result.valor).toBe(0);
  });

  test('rendimento mensal abaixo da isencao: IR 0', () => {
    // 12000 / 12 = 1000/mes -> abaixo de 2259.20 -> isento
    const result = calcularIR_RRA(12000, 12);
    expect(result.valor).toBe(0);
    expect(result.aliquotaEfetiva).toBe(0);
  });

  test('meses limitados a maximo 12', () => {
    const result = calcularIR_RRA(50000, 24);
    // Internamente usa Math.min(24, 12) = 12 meses
    expect(result.memoria.mesesReferencia).toBe(12);
  });

  test('meses minimo 1', () => {
    const result = calcularIR_RRA(50000, 0);
    expect(result.memoria.mesesReferencia).toBe(1);
  });
});
