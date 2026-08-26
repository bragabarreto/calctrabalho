'use strict';

const {
  toDate,
  toISODate,
  contarAvos13,
  contarAvosFerias,
  contarMesesRemunerados,
  calcularTemporais,
} = require('../src/utils/datas');

const temporalDe = (dataAdmissao, dataDispensa, extra = {}) =>
  calcularTemporais(
    {
      dataAdmissao,
      dataDispensa,
      dataAjuizamento: '2026-08-26',
      avisoPrevioTrabalhado: false,
      ...extra,
    },
    extra.modalidade || 'sem_justa_causa'
  );

describe('toDate — imunidade a fuso horário', () => {
  test('string YYYY-MM-DD vira o dia civil correto', () => {
    const d = toDate('2025-06-04');
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(4);
  });

  test('Date em meia-noite UTC (Joi/new Date) não retrocede um dia', () => {
    const d = toDate(new Date('2025-06-04'));
    expect(d.getDate()).toBe(4);
    expect(d.getMonth()).toBe(5);
  });

  test('toISODate faz round-trip sem deslocamento', () => {
    expect(toISODate('2025-01-01')).toBe('2025-01-01');
    expect(toISODate(new Date('2025-12-31'))).toBe('2025-12-31');
  });

  test('dias trabalhados no mês da dispensa não perdem um dia', () => {
    // Regressão: com data coagida para UTC, 21/07 virava 20/07 em fuso negativo.
    expect(temporalDe('2025-06-04', '2025-07-21').diasUltimoMes).toBe(21);
    expect(temporalDe(new Date('2025-06-04'), new Date('2025-07-21')).diasUltimoMes).toBe(21);
  });
});

describe('contarAvos13 — mês civil com 15 dias ou mais (Lei 4.090/62)', () => {
  test('conta apenas meses com 15 dias ou mais', () => {
    const { avos, detalhe } = contarAvos13('2025-06-04', '2025-08-20');
    expect(avos).toBe(3); // jun 27d, jul 31d, ago 20d
    expect(detalhe.map((d) => d.dias)).toEqual([27, 31, 20]);
  });

  test('descarta mês final com menos de 15 dias', () => {
    expect(contarAvos13('2025-01-01', '2025-03-12').avos).toBe(2); // março tem 12 dias
  });

  test('mês de admissão com menos de 15 dias não gera avo', () => {
    expect(contarAvos13('2025-01-20', '2025-03-31').avos).toBe(2); // jan 12d descartado
  });

  test('limitado a 12 avos', () => {
    expect(contarAvos13('2025-01-01', '2025-12-31').avos).toBe(12);
  });
});

describe('contarAvosFerias — art. 146, § único, CLT', () => {
  test('fração de 15 dias ou mais vale mês inteiro', () => {
    const r = contarAvosFerias('2025-06-04', '2025-08-20');
    expect(r.mesesCompletos).toBe(2);
    expect(r.diasFracao).toBe(16);
    expect(r.avos).toBe(3);
  });

  test('fração menor que 15 dias é desprezada', () => {
    const r = contarAvosFerias('2025-06-04', '2025-08-12');
    expect(r.mesesCompletos).toBe(2);
    expect(r.avos).toBe(2);
  });

  test('limitado a 12 avos', () => {
    expect(contarAvosFerias('2024-01-01', '2025-06-30').avos).toBe(12);
  });
});

describe('contarMesesRemunerados — base do FGTS', () => {
  test('mês civil integral vale 1 e mês parcial vale dias/30', () => {
    // 04/06 a 21/07 → junho 27/30 + julho 21/30 = 1,6
    expect(contarMesesRemunerados('2025-06-04', '2025-07-21')).toBeCloseTo(1.6, 4);
  });

  test('ano contratual fechado dá exatamente 12 meses', () => {
    expect(contarMesesRemunerados('2024-06-04', '2025-06-03')).toBeCloseTo(12, 4);
  });

  test('mês civil completo com 31 dias continua valendo 1', () => {
    expect(contarMesesRemunerados('2025-07-01', '2025-07-31')).toBe(1);
  });
});

describe('calcularTemporais — cenários de contrato', () => {
  test('contrato curto: avos corretos e FGTS sem truncamento', () => {
    const t = temporalDe('2025-06-04', '2025-07-21');
    expect(t.diasAvisoPrevio).toBe(30);
    expect(t.avos13).toBe(3); // jun/jul/ago com projeção do aviso
    expect(t.avosFerias).toBe(3);
    // 1,6 do contrato + 1 do aviso indenizado
    expect(t.mesesRemunerados).toBeCloseTo(2.6, 4);
  });

  test('contrato que atravessa o ano: 13º conta só o ano da rescisão', () => {
    // Regressão: contando a partir do aniversário do contrato dava 3 avos.
    const t = temporalDe('2024-12-20', '2025-02-10');
    expect(t.avos13).toBe(2); // jan + fev; março tem 12 dias
  });

  test('contrato longo: 13º conta todos os meses civis do ano', () => {
    // Regressão: contando a partir do aniversário do contrato dava 6 avos.
    const t = temporalDe('2020-03-10', '2025-07-21');
    expect(t.diasAvisoPrevio).toBe(45);
    expect(t.avos13).toBe(8); // jan..ago; setembro tem 4 dias
  });

  test('projeção do aviso que ultrapassa 31/12 soma os avos do ano seguinte', () => {
    const t = temporalDe('2025-03-01', '2025-12-20');
    expect(t.avos13AnoSeguinte).toBe(1); // 01/01 a 19/01 = 19 dias
    expect(t.avos13).toBe(t.avos13Detalhe.filter((d) => d.conta).length + 1);
  });

  test('aviso trabalhado não projeta meses remunerados', () => {
    const t = temporalDe('2025-06-04', '2025-07-21', { avisoPrevioTrabalhado: true });
    expect(t.mesesRemunerados).toBeCloseTo(1.6, 4);
    expect(t.avos13).toBe(2); // junho e julho apenas
  });
});
