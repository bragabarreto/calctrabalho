'use strict';

const { calcularPericulosidade, calcularReflexosPericulosidade } = require('../src/services/calculo/verbas/periculosidade');

describe('calcularPericulosidade', () => {
  test('retorna 0 se percentual nao informado', () => {
    const dados = { ultimoSalario: 3000 };
    const temporal = { marcoPrescricional: new Date('2019-01-15'), dataDispensa: new Date('2024-01-15') };
    const result = calcularPericulosidade(dados, temporal);
    expect(result.valor).toBe(0);
    expect(result.excluida).toBe(false);
  });

  test('retorna 0 e excluida=true se verba excluida', () => {
    const dados = { ultimoSalario: 3000, adicionalPericulosidadePercentual: 0.30, verbasExcluidas: ['periculosidade'] };
    const temporal = { marcoPrescricional: new Date('2019-01-15'), dataDispensa: new Date('2024-01-15') };
    const result = calcularPericulosidade(dados, temporal);
    expect(result.valor).toBe(0);
    expect(result.excluida).toBe(true);
  });

  test('calcula 30% proporcional ao periodo', () => {
    const dados = {
      ultimoSalario: 5000,
      adicionalPericulosidadePercentual: 0.30,
      dataInicioPericulosidade: '2023-01-15',
      dataFimPericulosidade: '2024-01-15',
    };
    const temporal = { marcoPrescricional: new Date('2019-01-15'), dataDispensa: new Date('2024-01-15') };
    const result = calcularPericulosidade(dados, temporal);
    // 5000 * 0.30 * 12 meses = 18000
    expect(result.valor).toBe(18000);
    expect(result.memoria.mesesCompletos).toBe(12);
  });
});

describe('Periculosidade reflexos — OJ 82 SDI-1 fix', () => {
  test('13o reflexo usa lapsoComAviso (nao lapsoSemAviso)', () => {
    const perResult = { valor: 3000, memoriaInputs: {} };
    const dados = { avisoPrevioTrabalhado: false };
    const temporal = {
      lapsoSemAviso: { meses: 24, mesesRestantes: 10, diasRestantes: 20 },
      lapsoComAviso: { meses: 25, mesesRestantes: 11, diasRestantes: 20 },
      mesesUltimoAno: 6,
      diasUltimoAno: 20,
      diasAvisoPrevio: 33,
    };
    const result = calcularReflexosPericulosidade(perResult, dados, temporal, 'sem_justa_causa');

    // mediaPer = 3000 / 24 = 125
    const mediaPer = 3000 / 24;
    // meses13 = lapsoComAviso.mesesRestantes + (diasRestantes >= 15 ? 1 : 0)
    //         = 11 + 1 = 12
    const meses13 = 12;
    const expected13 = Math.round((mediaPer / 12) * meses13 * 100) / 100;
    expect(result.decimoTerceiro.valor).toBeCloseTo(expected13, 1);
    expect(result.decimoTerceiro.memoria.criterio).toContain('OJ 82');
  });

  test('ferias usa mesesUltimoAno + arredondamento >= 15 dias', () => {
    const perResult = { valor: 6000, memoriaInputs: {} };
    const dados = { avisoPrevioTrabalhado: false };
    const temporal = {
      lapsoSemAviso: { meses: 12, mesesRestantes: 6, diasRestantes: 10 },
      lapsoComAviso: { meses: 13, mesesRestantes: 7, diasRestantes: 10 },
      mesesUltimoAno: 6,
      diasUltimoAno: 20,
      diasAvisoPrevio: 33,
    };
    const result = calcularReflexosPericulosidade(perResult, dados, temporal, 'sem_justa_causa');

    const mediaPer = 6000 / 12;
    // mesesFerias = 6 + (20 >= 15 ? 1 : 0) = 7
    const mesesFerias = 7;
    const expectedFerias = Math.round(mediaPer * (mesesFerias / 12) * (4 / 3) * 100) / 100;
    expect(result.ferias.valor).toBeCloseTo(expectedFerias, 1);
  });

  test('aviso previo nao devida em pedido de demissao', () => {
    const perResult = { valor: 6000, memoriaInputs: {} };
    const dados = { avisoPrevioTrabalhado: false };
    const temporal = {
      lapsoSemAviso: { meses: 12, mesesRestantes: 6, diasRestantes: 10 },
      lapsoComAviso: { meses: 13, mesesRestantes: 7, diasRestantes: 10 },
      mesesUltimoAno: 6,
      diasUltimoAno: 20,
      diasAvisoPrevio: 33,
    };
    const result = calcularReflexosPericulosidade(perResult, dados, temporal, 'pedido_demissao');
    expect(result.avisoPrevio.valor).toBe(0);
  });

  test('reflexos zerados quando periculosidade = 0', () => {
    const perResult = { valor: 0 };
    const dados = {};
    const temporal = {};
    const result = calcularReflexosPericulosidade(perResult, dados, temporal, 'sem_justa_causa');
    expect(result.ferias.valor).toBe(0);
    expect(result.decimoTerceiro.valor).toBe(0);
    expect(result.fgts.valor).toBe(0);
    expect(result.mulFgts.valor).toBe(0);
  });
});
