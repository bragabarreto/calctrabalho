'use strict';

const {
  calcularRSRNaoConcedido,
  calcularFeriadosLaborados,
  calcularReflexosRSRFeriados,
} = require('../src/services/calculo/verbas/rsrFeriados');
const { calcularPeriodoJornada } = require('../src/services/calculo/verbas/cartaoPontoVirtual');

const temporal = {
  lapsoSemAviso: { meses: 24, mesesRestantes: 0, diasRestantes: 0 },
  lapsoComAviso: { meses: 25, mesesRestantes: 1, diasRestantes: 3 },
  avosFerias: 6,
  avos13: 7,
  mesesUltimoAno: 6,
  diasUltimoAno: 0,
  diasAvisoPrevio: 33,
};

describe('RSR não concedido — modo médio (sem cartão de ponto)', () => {
  test('retorna 0 e motivo quando não habilitado', () => {
    const r = calcularRSRNaoConcedido({ ultimoSalario: 3000 }, temporal, []);
    expect(r.valor).toBe(0);
    expect(r.memoria.motivo).toMatch(/não habilitado/);
  });

  test('habilitado sem média informada → 0 com orientação', () => {
    const r = calcularRSRNaoConcedido({ ultimoSalario: 3000, rsrNaoConcedido: true }, temporal, []);
    expect(r.valor).toBe(0);
    expect(r.memoria.motivo).toMatch(/média/);
  });

  test('calcula salário/30 × dias/mês × meses (Súm. 146 TST)', () => {
    const dados = { ultimoSalario: 3000, rsrNaoConcedido: true, mediaRsrDiasMensais: 4.33 };
    const r = calcularRSRNaoConcedido(dados, temporal, []);
    // 100/dia × 4.33 × 24 = 10392
    expect(r.valor).toBeCloseTo(10392, 2);
    expect(r.natureza).toBe('salarial');
    expect(r.memoria.formula).toContain('modo médio');
  });
});

describe('Feriados laborados — modo médio', () => {
  test('calcula salário/30 × feriados/mês × meses', () => {
    const dados = { ultimoSalario: 3000, feriadosLaborados: true, mediaFeriadosDiasMensais: 1 };
    const r = calcularFeriadosLaborados(dados, temporal, []);
    // 100/dia × 1 × 24 = 2400
    expect(r.valor).toBe(2400);
    expect(r.natureza).toBe('salarial');
  });

  test('cartão de ponto: conta apenas feriados efetivamente trabalhados', () => {
    const dias = [
      { data: '2024-01-01', ehFeriado: true, trabalhado: true, afastado: false, ferias: false },
      { data: '2024-04-21', ehFeriado: true, trabalhado: false, afastado: false, ferias: false },
      { data: '2024-05-01', ehFeriado: true, trabalhado: true, afastado: false, ferias: true },
      { data: '2024-05-02', ehFeriado: false, trabalhado: true, afastado: false, ferias: false },
    ];
    const r = calcularFeriadosLaborados({ ultimoSalario: 3000, feriadosLaborados: true }, temporal, dias);
    expect(r.qtdeDias).toBe(1);
    expect(r.valor).toBe(100);
    expect(r.diasFeriados).toEqual(['2024-01-01']);
  });
});

describe('Reflexos RSR/feriados', () => {
  test('zera reflexos quando a verba é 0', () => {
    const r = calcularReflexosRSRFeriados({ valor: 0 }, {}, temporal, 'sem_justa_causa');
    expect(r.ferias.valor).toBe(0);
    expect(r.decimoTerceiro.valor).toBe(0);
    expect(r.fgts.valor).toBe(0);
  });

  test('gera férias, 13º, FGTS, multa e aviso proporcionais à média mensal', () => {
    const r = calcularReflexosRSRFeriados({ valor: 2400 }, { avisoPrevioTrabalhado: false }, temporal, 'sem_justa_causa');
    const media = 2400 / 24; // 100/mês
    expect(r.ferias.valor).toBeCloseTo(media * (6 / 12) * (4 / 3), 2);
    expect(r.decimoTerceiro.valor).toBeCloseTo((media / 12) * 7, 2);
    expect(r.avisoPrevio.valor).toBeCloseTo(media * (33 / 30), 2);
    const fgtsEsperado = Math.round((2400 + r.ferias.valor + r.decimoTerceiro.valor) * 0.08 * 100) / 100;
    expect(r.fgts.valor).toBeCloseTo(fgtsEsperado, 2);
    expect(r.mulFgts.valor).toBeCloseTo(Math.round(fgtsEsperado * 0.4 * 100) / 100, 2);
  });

  test('justa causa: sem férias proporcionais (Súm. 171) e sem aviso', () => {
    const r = calcularReflexosRSRFeriados({ valor: 2400 }, {}, temporal, 'justa_causa');
    expect(r.ferias.valor).toBe(0);
    expect(r.avisoPrevio.valor).toBe(0);
    expect(r.mulFgts.valor).toBe(0);
  });
});

describe('Adicional noturno — modo médio 12x36', () => {
  test('considera a média de horas noturnas por turno (~15 turnos/mês)', () => {
    const periodo = {
      modoEntrada: 'medio',
      padraoApuracao: '12x36',
      mediaHorasExtrasPorTurno: 0,
      mediaHorasNoturnasDiarias: 7,
      dataInicio: '2024-01-01',
      dataFim: '2024-03-31',
    };
    const r = calcularPeriodoJornada(periodo, '2024-01-01', '2024-03-31');
    expect(r.numMeses).toBe(3);
    expect(r.totalHorasNoturnas).toBeCloseTo(7 * 15 * 3, 2);
    expect(r.distribuicaoMensal[0].horasNoturnas).toBeCloseTo(105, 2);
  });
});
