'use strict';

const { aplicarCascataOJ394 } = require('../src/services/calculo/reflexosCascata');

describe('OJ 394 SDI-1 TST — Reflexos em Cascata', () => {
  const temporal = {
    lapsoSemAviso: { meses: 12, mesesRestantes: 6, diasRestantes: 20 },
    lapsoComAviso: { meses: 13, mesesRestantes: 7, diasRestantes: 20 },
    mesesUltimoAno: 6,
    diasUltimoAno: 20,
    diasAvisoPrevio: 33,
    dataDispensa: new Date('2024-01-15'),
  };
  const dados = { avisoPrevioTrabalhado: false };

  test('incrementa ferias com RSR majorado', () => {
    const verbas = { horasExtras: { valor: 6000 } };
    const reflexos = {
      horasExtras: {
        rsr: { valor: 1000, memoria: {} },
        ferias: { valor: 500, memoria: {} },
        decimoTerceiro: { valor: 300, memoria: {} },
        avisoPrevio: { valor: 200, memoria: {} },
        fgts: { valor: 640, memoria: {} },
        mulFgts: { valor: 256, memoria: {} },
      },
    };

    const feriasAntes = reflexos.horasExtras.ferias.valor;
    aplicarCascataOJ394(verbas, reflexos, temporal, dados, 'sem_justa_causa');
    expect(reflexos.horasExtras.ferias.valor).toBeGreaterThan(feriasAntes);
    expect(reflexos.horasExtras.ferias.memoria.criterio).toContain('OJ 394');
  });

  test('incrementa 13o com RSR majorado', () => {
    const verbas = { horasExtras: { valor: 6000 } };
    const reflexos = {
      horasExtras: {
        rsr: { valor: 1200, memoria: {} },
        ferias: { valor: 500, memoria: {} },
        decimoTerceiro: { valor: 300, memoria: {} },
        avisoPrevio: { valor: 200, memoria: {} },
        fgts: { valor: 640, memoria: {} },
        mulFgts: { valor: 256, memoria: {} },
      },
    };

    const antes13 = reflexos.horasExtras.decimoTerceiro.valor;
    aplicarCascataOJ394(verbas, reflexos, temporal, dados, 'sem_justa_causa');
    expect(reflexos.horasExtras.decimoTerceiro.valor).toBeGreaterThan(antes13);
    expect(reflexos.horasExtras.decimoTerceiro.memoria.criterio).toContain('OJ 394');
  });

  test('recalcula FGTS apos cascata', () => {
    const verbas = { horasExtras: { valor: 6000 } };
    const reflexos = {
      horasExtras: {
        rsr: { valor: 1000, memoria: {} },
        ferias: { valor: 500, memoria: {} },
        decimoTerceiro: { valor: 300, memoria: {} },
        avisoPrevio: { valor: 200, memoria: {} },
        fgts: { valor: 640, memoria: {} },
        mulFgts: { valor: 256, memoria: {} },
      },
    };

    const fgtsAntes = reflexos.horasExtras.fgts.valor;
    aplicarCascataOJ394(verbas, reflexos, temporal, dados, 'sem_justa_causa');
    // FGTS deve ser recalculado com os novos valores de ferias e 13o
    expect(reflexos.horasExtras.fgts.memoria.criterio).toContain('OJ 394');
  });

  test('recalcula multa FGTS apos cascata', () => {
    const verbas = { horasExtras: { valor: 6000 } };
    const reflexos = {
      horasExtras: {
        rsr: { valor: 1000, memoria: {} },
        ferias: { valor: 500, memoria: {} },
        decimoTerceiro: { valor: 300, memoria: {} },
        avisoPrevio: { valor: 200, memoria: {} },
        fgts: { valor: 640, memoria: {} },
        mulFgts: { valor: 256, memoria: {} },
      },
    };

    aplicarCascataOJ394(verbas, reflexos, temporal, dados, 'sem_justa_causa');
    // mulFgts = fgts * 40% (sem_justa_causa)
    const expectedMulFgts = Math.round(reflexos.horasExtras.fgts.valor * 0.40 * 100) / 100;
    expect(reflexos.horasExtras.mulFgts.valor).toBeCloseTo(expectedMulFgts, 2);
  });

  test('nao modifica se RSR = 0', () => {
    const verbas = { horasExtras: { valor: 0 } };
    const reflexos = {
      horasExtras: {
        rsr: { valor: 0, memoria: {} },
        ferias: { valor: 0, memoria: {} },
        decimoTerceiro: { valor: 0, memoria: {} },
        fgts: { valor: 0, memoria: {} },
      },
    };

    aplicarCascataOJ394(verbas, reflexos, temporal, dados, 'sem_justa_causa');
    expect(reflexos.horasExtras.ferias.valor).toBe(0);
    expect(reflexos.horasExtras.decimoTerceiro.valor).toBe(0);
    expect(reflexos.horasExtras.fgts.valor).toBe(0);
  });

  test('multa FGTS 20% em culpa reciproca', () => {
    const verbas = { horasExtras: { valor: 6000 } };
    const reflexos = {
      horasExtras: {
        rsr: { valor: 1000, memoria: {} },
        ferias: { valor: 500, memoria: {} },
        decimoTerceiro: { valor: 300, memoria: {} },
        avisoPrevio: { valor: 200, memoria: {} },
        fgts: { valor: 640, memoria: {} },
        mulFgts: { valor: 128, memoria: {} },
      },
    };

    aplicarCascataOJ394(verbas, reflexos, temporal, dados, 'culpa_reciproca');
    const expectedMulFgts = Math.round(reflexos.horasExtras.fgts.valor * 0.20 * 100) / 100;
    expect(reflexos.horasExtras.mulFgts.valor).toBeCloseTo(expectedMulFgts, 2);
  });

  test('ignora chaves sem reflexos', () => {
    const verbas = { horasExtras: { valor: 6000 } };
    const reflexos = {};

    // Should not throw
    expect(() => {
      aplicarCascataOJ394(verbas, reflexos, temporal, dados, 'sem_justa_causa');
    }).not.toThrow();
  });
});
