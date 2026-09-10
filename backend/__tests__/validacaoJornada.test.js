'use strict';

/**
 * Regressão: os campos da etapa "Horário de Trabalho" (RSR não concedido,
 * feriados laborados, interjornada, térmico, digitação, OJ 97) precisam ser
 * aceitos pelo schema Joi. Antes, o schema tinha allowUnknown:false e não os
 * declarava — e o frontend nem os enviava — então o engine sempre recebia
 * `undefined` e tratava as verbas como "não habilitadas" (sumiam do resumo).
 */

const { schemaSimular } = require('../src/middlewares/validacao');

const base = {
  dataAdmissao: '2022-01-10',
  dataDispensa: '2024-06-30',
  dataAjuizamento: '2024-08-01',
  ultimoSalario: 3000,
};

function validar(dados) {
  return schemaSimular.validate({ dados, modalidade: 'sem_justa_causa' }, { abortEarly: false });
}

describe('schemaDadosContrato — campos da etapa Jornada', () => {
  test('aceita RSR não concedido e feriados laborados em modo médio', () => {
    const { error, value } = validar({
      ...base,
      rsrNaoConcedido: true,
      mediaRsrDiasMensais: 4.33,
      feriadosLaborados: true,
      mediaFeriadosDiasMensais: 1,
      feriadosAdicionais: ['2024-03-19', '2024-08-15'],
    });
    expect(error).toBeUndefined();
    expect(value.dados.rsrNaoConcedido).toBe(true);
    expect(value.dados.mediaRsrDiasMensais).toBe(4.33);
    expect(value.dados.feriadosLaborados).toBe(true);
    expect(value.dados.mediaFeriadosDiasMensais).toBe(1);
    expect(value.dados.feriadosAdicionais).toEqual(['2024-03-19', '2024-08-15']);
  });

  test('aceita os demais toggles de jornada (OJ 97, interjornada, térmico, digitação)', () => {
    const { error, value } = validar({
      ...base,
      adicionalNoturnoOJ97: true,
      intrajornadaModo: 'manual',
      intervaloInterjornada: true,
      mediaInterjornadaMinsMensais: 120,
      intervaloTermico: true,
      tipoAmbienteTermico: 'frio',
      minIntervaloTermicoConcedido: 10,
      intervaloDigitacao: true,
      regimeDigitacao: '50min',
      horasIntervaloDigitacaoConcedido: 2,
    });
    expect(error).toBeUndefined();
    expect(value.dados.adicionalNoturnoOJ97).toBe(true);
    expect(value.dados.intrajornadaModo).toBe('manual');
    expect(value.dados.tipoAmbienteTermico).toBe('frio');
    expect(value.dados.regimeDigitacao).toBe('50min');
  });

  test('aplica defaults quando os campos são omitidos', () => {
    const { error, value } = validar({ ...base });
    expect(error).toBeUndefined();
    expect(value.dados.rsrNaoConcedido).toBe(false);
    expect(value.dados.feriadosLaborados).toBe(false);
    expect(value.dados.mediaRsrDiasMensais).toBe(0);
    expect(value.dados.feriadosAdicionais).toEqual([]);
    expect(value.dados.intrajornadaModo).toBe('automatico');
    expect(value.dados.regimeDigitacao).toBe('90min');
  });

  test('rejeita feriado adicional fora do formato YYYY-MM-DD', () => {
    const { error } = validar({ ...base, feriadosLaborados: true, feriadosAdicionais: ['19/03/2024'] });
    expect(error).toBeDefined();
    expect(error.details.some(d => d.path.join('.').startsWith('dados.feriadosAdicionais'))).toBe(true);
  });

  test('continua rejeitando campos desconhecidos', () => {
    const { error } = validar({ ...base, campoInexistente: 1 });
    expect(error).toBeDefined();
  });
});
