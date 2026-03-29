'use strict';

const { deveGerarReflexos, validarNaturezaReflexos, NATUREZAS } = require('../src/utils/naturezaJuridica');

describe('NATUREZAS constantes', () => {
  test('define SALARIAL e INDENIZATORIA', () => {
    expect(NATUREZAS.SALARIAL).toBe('salarial');
    expect(NATUREZAS.INDENIZATORIA).toBe('indenizatoria');
  });
});

describe('deveGerarReflexos', () => {
  test('salarial: deve gerar reflexos', () => {
    expect(deveGerarReflexos('salarial')).toBe(true);
  });

  test('indenizatoria: nao deve gerar reflexos', () => {
    expect(deveGerarReflexos('indenizatoria')).toBe(false);
  });

  test('valor indefinido: nao deve gerar reflexos', () => {
    expect(deveGerarReflexos(undefined)).toBe(false);
  });

  test('string vazia: nao deve gerar reflexos', () => {
    expect(deveGerarReflexos('')).toBe(false);
  });
});

describe('validarNaturezaReflexos', () => {
  test('indenizatoria com reflexos: retorna aviso (invalido)', () => {
    const result = validarNaturezaReflexos({
      nome: 'Parcela Teste',
      natureza: 'indenizatoria',
      geraReflexos: true,
    });
    expect(result.valido).toBe(false);
    expect(result.aviso).toBeTruthy();
    expect(result.aviso).toContain('Parcela Teste');
    expect(result.aviso).toContain('indenizat');
  });

  test('salarial com reflexos: valido', () => {
    const result = validarNaturezaReflexos({
      nome: 'HE 50%',
      natureza: 'salarial',
      geraReflexos: true,
    });
    expect(result.valido).toBe(true);
    expect(result.aviso).toBeUndefined();
  });

  test('indenizatoria sem reflexos: valido (coerente)', () => {
    const result = validarNaturezaReflexos({
      nome: 'Dano moral',
      natureza: 'indenizatoria',
      geraReflexos: false,
    });
    expect(result.valido).toBe(true);
  });

  test('salarial sem reflexos: valido (permitido)', () => {
    const result = validarNaturezaReflexos({
      nome: 'Gratificacao',
      natureza: 'salarial',
      geraReflexos: false,
    });
    expect(result.valido).toBe(true);
  });
});
