'use strict';

const { calcularBaseRescisoria, calcularRemuneracaoMensal } = require('../src/utils/baseRescisoria');

describe('calcularBaseRescisoria', () => {
  test('sem gorjetas: salario + comissoes', () => {
    const dados = { ultimoSalario: 3000, comissoes: 500, gorjetas: 200 };
    const result = calcularBaseRescisoria(dados, { incluirGorjetas: false });
    expect(result.valor).toBe(3500);
    expect(result.componentes.gorjetas).toBe(0);
  });

  test('com gorjetas: salario + comissoes + gorjetas', () => {
    const dados = { ultimoSalario: 3000, comissoes: 500, gorjetas: 200 };
    const result = calcularBaseRescisoria(dados, { incluirGorjetas: true });
    expect(result.valor).toBe(3700);
    expect(result.componentes.gorjetas).toBe(200);
  });

  test('dados zerados retorna valor 0', () => {
    const result = calcularBaseRescisoria({});
    expect(result.valor).toBe(0);
    expect(result.componentes.salarioBase).toBe(0);
    expect(result.componentes.comissoes).toBe(0);
    expect(result.componentes.gorjetas).toBe(0);
  });

  test('opcoes padrao: gorjetas excluidas', () => {
    const dados = { ultimoSalario: 2000, gorjetas: 500 };
    const result = calcularBaseRescisoria(dados);
    expect(result.valor).toBe(2000);
    expect(result.componentes.gorjetas).toBe(0);
  });

  test('memoria contém criterio OJ 181', () => {
    const dados = { ultimoSalario: 5000 };
    const result = calcularBaseRescisoria(dados);
    expect(result.memoria.criterio).toContain('OJ 181');
    expect(result.memoria.criterio).toContain('art. 457');
  });

  test('memoria contém formula legivel', () => {
    const dados = { ultimoSalario: 3000, comissoes: 500 };
    const result = calcularBaseRescisoria(dados);
    expect(result.memoria.formula).toContain('3000.00');
    expect(result.memoria.formula).toContain('500.00');
    expect(result.memoria.formula).toContain('3500.00');
  });
});

describe('calcularRemuneracaoMensal', () => {
  test('inclui todos os componentes (art. 457 §1 CLT)', () => {
    const valor = calcularRemuneracaoMensal({ ultimoSalario: 5000, comissoes: 1000, gorjetas: 300 });
    expect(valor).toBe(6300);
  });

  test('sem gorjetas/comissoes retorna apenas salario', () => {
    const valor = calcularRemuneracaoMensal({ ultimoSalario: 5000 });
    expect(valor).toBe(5000);
  });

  test('objeto vazio retorna 0', () => {
    const valor = calcularRemuneracaoMensal({});
    expect(valor).toBe(0);
  });

  test('arredonda para 2 casas decimais', () => {
    const valor = calcularRemuneracaoMensal({ ultimoSalario: 1000.333, comissoes: 500.666 });
    // round2(1000.333 + 500.666 + 0) = round2(1500.999) = 1501.00
    expect(valor).toBe(1501);
  });
});
