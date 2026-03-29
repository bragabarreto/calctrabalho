'use strict';

const { calcularMultaArt467, calcularMultaArt477 } = require('../src/services/calculo/verbas/multasArt467e477');

describe('Multa Art. 477 §8 CLT', () => {
  test('base inclui gorjetas (art. 457 §1 CLT)', () => {
    const dados = { ultimoSalario: 3000, comissoes: 500, gorjetas: 200 };
    const temporal = { dataDispensa: new Date('2024-01-15') };
    const result = calcularMultaArt477(dados, temporal);
    // Base = calcularRemuneracaoMensal(dados) = 3000 + 500 + 200 = 3700
    expect(result.valor).toBe(3700);
  });

  test('sem gorjetas: base = salario + comissoes', () => {
    const dados = { ultimoSalario: 3000, comissoes: 500 };
    const temporal = { dataDispensa: new Date('2024-01-15') };
    const result = calcularMultaArt477(dados, temporal);
    expect(result.valor).toBe(3500);
  });

  test('pagamento no prazo: nao devida (valor = 0)', () => {
    const dados = { ultimoSalario: 3000, comissoes: 0, dataPgtoRescisorio: '2024-01-20' };
    const temporal = { dataDispensa: new Date('2024-01-15') };
    const result = calcularMultaArt477(dados, temporal);
    expect(result.valor).toBe(0);
    expect(result.memoria.motivo).toContain('prazo');
  });

  test('pagamento apos 10 dias: devida', () => {
    const dados = { ultimoSalario: 2000, dataPgtoRescisorio: '2024-01-30' };
    const temporal = { dataDispensa: new Date('2024-01-15') };
    const result = calcularMultaArt477(dados, temporal);
    expect(result.valor).toBe(2000);
  });

  test('verba excluida: retorna 0', () => {
    const dados = { ultimoSalario: 3000, verbasExcluidas: ['multa_art_477'] };
    const temporal = { dataDispensa: new Date('2024-01-15') };
    const result = calcularMultaArt477(dados, temporal);
    expect(result.valor).toBe(0);
    expect(result.excluida).toBe(true);
  });
});

describe('Multa Art. 467 CLT', () => {
  test('base inclui gorjetas (art. 457 §1 CLT)', () => {
    const dados = { ultimoSalario: 3000, comissoes: 500, gorjetas: 200 };
    const temporal = { dataDispensa: new Date('2024-01-15') };
    const result = calcularMultaArt467(dados, temporal);
    // Sem pagamento rescisorio => devida
    expect(result.valor).toBe(3700);
  });

  test('sem gorjetas: base = salario + comissoes', () => {
    const dados = { ultimoSalario: 3000, comissoes: 500 };
    const temporal = { dataDispensa: new Date('2024-01-15') };
    const result = calcularMultaArt467(dados, temporal);
    expect(result.valor).toBe(3500);
  });

  test('pagamento no prazo: nao devida', () => {
    const dados = { ultimoSalario: 3000, dataPgtoRescisorio: '2024-01-20' };
    const temporal = { dataDispensa: new Date('2024-01-15') };
    const result = calcularMultaArt467(dados, temporal);
    expect(result.valor).toBe(0);
  });

  test('verba excluida: retorna 0', () => {
    const dados = { ultimoSalario: 3000, verbasExcluidas: ['multa_art_467'] };
    const temporal = { dataDispensa: new Date('2024-01-15') };
    const result = calcularMultaArt467(dados, temporal);
    expect(result.valor).toBe(0);
    expect(result.excluida).toBe(true);
  });
});
