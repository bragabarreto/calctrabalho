'use strict';

/**
 * Súmula 171 TST — as férias proporcionais são indevidas apenas quando o
 * contrato de trabalho termina por dispensa do empregado por justa causa.
 *
 * Cobre tanto a verba principal (calcularFeriasProporcionais) quanto os
 * reflexos de férias das demais verbas, que seguem a sorte do principal.
 */

const {
  calcularFeriasProporcionais,
  feriasProporcionaisDevidas,
} = require('../src/services/calculo/verbas/ferias');
const { calcularReflexosHE } = require('../src/services/calculo/verbas/horasExtras');
const { calcularReflexosAN } = require('../src/services/calculo/verbas/adicionalNoturno');
const { calcularReflexosInsalubridade } = require('../src/services/calculo/verbas/insalubridade');
const { calcularReflexosPericulosidade } = require('../src/services/calculo/verbas/periculosidade');
const { calcularReflexosRSRFeriados } = require('../src/services/calculo/verbas/rsrFeriados');
const { calcularReflexosIntervaloTermico } = require('../src/services/calculo/verbas/intervaloTermico');
const { calcularReflexosIntervaloDigitacao } = require('../src/services/calculo/verbas/intervaloDigitacao');
const { calcularReflexosParcela } = require('../src/services/calculo/verbas/parcelasGenericas');
const { aplicarCascataOJ394 } = require('../src/services/calculo/reflexosCascata');

const MODALIDADES_COM_FERIAS = [
  'sem_justa_causa',
  'pedido_demissao',
  'culpa_reciproca',
  'rescisao_indireta',
];

// mesesUltimoAno 6 + diasUltimoAno 20 (>= 15) => 7/12 avos
const temporalBase = () => ({
  lapsoSemAviso: { meses: 12, mesesRestantes: 6, diasRestantes: 20 },
  lapsoComAviso: { meses: 13, mesesRestantes: 7, diasRestantes: 20 },
  mesesUltimoAno: 6,
  diasUltimoAno: 20,
  diasAvisoPrevio: 33,
});

const dadosBase = () => ({ ultimoSalario: 3000, avisoPrevioTrabalhado: false });

describe('feriasProporcionaisDevidas — Súmula 171 TST', () => {
  test('indevidas apenas na justa causa', () => {
    expect(feriasProporcionaisDevidas('justa_causa')).toBe(false);
  });

  test.each(MODALIDADES_COM_FERIAS)('devidas em %s', (modalidade) => {
    expect(feriasProporcionaisDevidas(modalidade)).toBe(true);
  });
});

describe('calcularFeriasProporcionais', () => {
  test('justa causa — verba zerada e excluída com motivo da Súmula 171', () => {
    const result = calcularFeriasProporcionais(dadosBase(), temporalBase(), 'justa_causa');
    expect(result.valor).toBe(0);
    expect(result.excluida).toBe(true);
    expect(result.memoria.motivo).toContain('Súmula 171');
  });

  test.each(MODALIDADES_COM_FERIAS)('%s — verba apurada normalmente', (modalidade) => {
    const result = calcularFeriasProporcionais(dadosBase(), temporalBase(), modalidade);
    // 3000 × (7/12) × 4/3 = 2333,33
    expect(result.valor).toBeCloseTo(2333.33, 2);
    expect(result.excluida).toBe(false);
  });

  test('justa causa prevalece mesmo com valor pago parcialmente informado', () => {
    const dados = { ...dadosBase(), valorPagoFeriasProporcionais: 500 };
    const result = calcularFeriasProporcionais(dados, temporalBase(), 'justa_causa');
    expect(result.valor).toBe(0);
    expect(result.excluida).toBe(true);
  });

  test('exclusão manual da verba tem precedência sobre a modalidade', () => {
    const dados = { ...dadosBase(), verbasExcluidas: ['ferias_proporcionais'] };
    const result = calcularFeriasProporcionais(dados, temporalBase(), 'sem_justa_causa');
    expect(result.valor).toBe(0);
    expect(result.excluida).toBe(true);
    expect(result.memoria.motivo).toBe('Excluída do cálculo');
  });
});

describe('Reflexos de férias das demais verbas — Súmula 171 TST', () => {
  const casos = [
    {
      nome: 'horas extras',
      fn: (modalidade) =>
        calcularReflexosHE(
          { valor: 6000, valorHora: 20, memoria: {} },
          { ...dadosBase(), qtdeHorasExtrasMensais: 20, divisorJornada: 220, adicionalHoraExtra: 0.5 },
          temporalBase(),
          modalidade
        ),
    },
    {
      nome: 'adicional noturno',
      fn: (modalidade) =>
        calcularReflexosAN({ valor: 6000 }, dadosBase(), temporalBase(), modalidade),
    },
    {
      nome: 'insalubridade',
      fn: (modalidade) =>
        calcularReflexosInsalubridade({ valor: 6000 }, dadosBase(), temporalBase(), modalidade),
    },
    {
      nome: 'periculosidade',
      fn: (modalidade) =>
        calcularReflexosPericulosidade({ valor: 6000 }, dadosBase(), temporalBase(), modalidade),
    },
    {
      nome: 'RSR não concedido / feriados laborados',
      fn: (modalidade) =>
        calcularReflexosRSRFeriados({ valor: 6000 }, dadosBase(), temporalBase(), modalidade),
    },
    {
      nome: 'intervalo térmico',
      fn: (modalidade) =>
        calcularReflexosIntervaloTermico({ valor: 6000 }, dadosBase(), temporalBase(), modalidade),
    },
    {
      nome: 'intervalo por digitação',
      fn: (modalidade) =>
        calcularReflexosIntervaloDigitacao({ valor: 6000 }, dadosBase(), temporalBase(), modalidade),
    },
  ];

  test.each(casos)('$nome — reflexo em férias zerado na justa causa', ({ fn }) => {
    expect(fn('justa_causa').ferias.valor).toBe(0);
  });

  test.each(casos)('$nome — reflexo em férias devido sem justa causa', ({ fn }) => {
    expect(fn('sem_justa_causa').ferias.valor).toBeGreaterThan(0);
  });

  test('base do FGTS acompanha a exclusão do reflexo de férias', () => {
    const semJC = calcularReflexosPericulosidade({ valor: 6000 }, dadosBase(), temporalBase(), 'sem_justa_causa');
    const comJC = calcularReflexosPericulosidade({ valor: 6000 }, dadosBase(), temporalBase(), 'justa_causa');
    expect(comJC.fgts.valor).toBeLessThan(semJC.fgts.valor);
    // 13º continua devido — apenas as férias proporcionais saem da base
    expect(comJC.decimoTerceiro.valor).toBeCloseTo(semJC.decimoTerceiro.valor, 2);
  });

  test('parcela personalizada genérica — reflexo em férias zerado na justa causa', () => {
    const parcela = {
      nome: 'Prêmio assiduidade',
      natureza: 'salarial',
      geraReflexos: true,
      reflexosEm: ['ferias', 'decimo_terceiro'],
    };
    const jc = calcularReflexosParcela(6000, 12, parcela, dadosBase(), temporalBase(), 'justa_causa');
    expect(jc.ferias.valor).toBe(0);
    expect(jc.ferias.memoria.motivo).toContain('Súmula 171');

    const sjc = calcularReflexosParcela(6000, 12, parcela, dadosBase(), temporalBase(), 'sem_justa_causa');
    expect(sjc.ferias.valor).toBeGreaterThan(0);
  });
});

describe('Cascata OJ 394 SDI-1 TST vs. Súmula 171 TST', () => {
  const montarCenario = () => ({
    verbas: { horasExtras: { valor: 6000 }, parcelasCustom: [] },
    reflexos: {
      horasExtras: {
        rsr: { valor: 1000 },
        ferias: { valor: 0, memoria: {} },
        decimoTerceiro: { valor: 500, memoria: {} },
        avisoPrevio: { valor: 0, memoria: {} },
        fgts: { valor: 600, memoria: {} },
        mulFgts: { valor: 0, memoria: {} },
      },
    },
  });

  test('justa causa — cascata não acrescenta valor às férias', () => {
    const { verbas, reflexos } = montarCenario();
    aplicarCascataOJ394(verbas, reflexos, temporalBase(), dadosBase(), 'justa_causa');
    expect(reflexos.horasExtras.ferias.valor).toBe(0);
    expect(reflexos.horasExtras.ferias.memoria.formulaOJ394).toBeUndefined();
    // 13º continua recebendo o incremento da cascata
    expect(reflexos.horasExtras.decimoTerceiro.valor).toBeGreaterThan(500);
  });

  test('sem justa causa — cascata acrescenta valor às férias', () => {
    const { verbas, reflexos } = montarCenario();
    aplicarCascataOJ394(verbas, reflexos, temporalBase(), dadosBase(), 'sem_justa_causa');
    expect(reflexos.horasExtras.ferias.valor).toBeGreaterThan(0);
    expect(reflexos.horasExtras.ferias.memoria.formulaOJ394).toContain('OJ 394');
  });
});
