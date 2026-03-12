'use strict';

const Joi = require('joi');

const schemaDadosContrato = Joi.object({
  // Datas
  dataAdmissao: Joi.date().iso().required().messages({ 'any.required': 'Data de admissão é obrigatória' }),
  dataDispensa: Joi.date().iso().min(Joi.ref('dataAdmissao')).required(),
  dataAjuizamento: Joi.date().iso().required(),
  dataPgtoRescisorio: Joi.date().iso().allow(null, '').optional(),
  avisoPrevioTrabalhado: Joi.boolean().default(false),

  // Remuneração
  ultimoSalario: Joi.number().positive().required(),
  mediaSalarial: Joi.number().positive().allow(null).optional(),
  comissoes: Joi.number().min(0).default(0),
  gorjetas: Joi.number().min(0).default(0),
  salariosMesesAtrasados: Joi.number().integer().min(0).default(0),
  comissoesMesesAtrasados: Joi.number().integer().min(0).default(0),

  // Férias e 13º
  qtdeFeriasVencidasDobradas: Joi.number().integer().min(0).default(0),
  qtdeFeriasVencidasSimples: Joi.number().integer().min(0).default(0),
  qtdeDecimoTerceiroVencidos: Joi.number().integer().min(0).default(0),

  // Jornada
  divisorJornada: Joi.number().positive().default(220),
  adicionalHoraExtra: Joi.number().min(0).default(0.5),
  qtdeHorasExtrasMensais: Joi.number().min(0).default(0),
  intervaloIntrajornadaMensalHoras: Joi.number().min(0).default(0),
  adicionalHoraNoturna: Joi.number().min(0).default(0.2),
  qtdeHorasNoturnasMensais: Joi.number().min(0).default(0),

  // Adicionais
  adicionalInsalubridadePercentual: Joi.number().min(0).max(1).default(0),
  dataInicioInsalubridade: Joi.date().iso().allow(null, '').optional(),
  dataFimInsalubridade: Joi.date().iso().allow(null, '').optional(),
  adicionalPericulosidadePercentual: Joi.number().min(0).max(1).default(0),
  dataInicioPericulosidade: Joi.date().iso().allow(null, '').optional(),
  dataFimPericulosidade: Joi.date().iso().allow(null, '').optional(),

  // Parcelas genéricas
  parcelaGenericaSalarialMensal: Joi.number().min(0).default(0),
  parcelaGenericaSalarialDiaria6d: Joi.number().min(0).default(0),
  parcelaGenericaSalarialDiaria5d: Joi.number().min(0).default(0),
  parcelaGenericaIndenizatoriaMensal: Joi.number().min(0).default(0),
  parcelaGenericaIndenizatoriaDiaria6d: Joi.number().min(0).default(0),
  parcelaGenericaIndenizatoriaDiaria5d: Joi.number().min(0).default(0),
  parcelaGenericaIndenizatoriaUnica: Joi.number().min(0).default(0),
  valorDanoMoral: Joi.number().min(0).default(0),

  // Deduções
  fgtsDepositado: Joi.number().min(0).default(0),
  valorPago: Joi.number().min(0).default(0),

  // Honorários
  percentualHonorarios: Joi.number().min(0).max(1).default(0.15),

  // Afastamentos
  mesesAfastamento: Joi.number().integer().min(0).default(0),
  diasAfastamento: Joi.number().integer().min(0).default(0),

  // Verbas excluídas
  verbasExcluidas: Joi.array().items(Joi.string()).default([]),

  // Parcelas personalizadas selecionadas para o cálculo
  parcelasPersonalizadas: Joi.array().items(Joi.object({
    id: Joi.string().uuid().optional(),
    nome: Joi.string().required(),
    natureza: Joi.string().valid('salarial', 'indenizatoria').required(),
    periodoTipo: Joi.string().valid('contrato', 'especifico').default('contrato'),
    periodoInicio: Joi.date().iso().allow(null, '').optional(),
    periodoFim: Joi.date().iso().allow(null, '').optional(),
    frequencia: Joi.string().valid('horaria', 'diaria_6d', 'diaria_5d', 'mensal', 'semestral', 'anual', 'calculada', 'unica').required(),
    tipoValor: Joi.string().valid('fixo', 'percentual_salario', 'percentual_sm').default('fixo'),
    valorBase: Joi.number().min(0).allow(null).optional(),
    percentualBase: Joi.number().min(0).allow(null).optional(),
    percentualAdicional: Joi.number().min(0).default(0),
    geraReflexos: Joi.boolean().default(false),
    reflexosEm: Joi.array().items(Joi.string()).default([]),
    incideInss: Joi.boolean().default(false),
    incideIr: Joi.boolean().default(false),
    incideFgts: Joi.boolean().default(false),
  })).default([]),

  // Deduções detalhadas
  deducoesGlobais: Joi.array().items(Joi.object({
    descricao: Joi.string().required(),
    valor: Joi.number().min(0).required(),
  })).default([]),
  deducoesPorVerba: Joi.array().items(Joi.object({
    codigoVerba: Joi.string().required(),
    descricao: Joi.string().allow('', null).optional(),
    valor: Joi.number().min(0).required(),
  })).default([]),

  // Acordo
  valorAcordo: Joi.number().min(0).allow(null).optional(),
  tipoAcordo: Joi.string().valid('sem_vinculo', 'com_vinculo_conhecimento', 'com_vinculo_execucao').allow(null).optional(),
  tipoDevedor: Joi.string().valid('pf_mei_me_epp', 'outros').allow(null).optional(),
  valorLiquidoExequente: Joi.number().min(0).allow(null).optional(),
  contribuicaoSocialLiquidacao: Joi.number().min(0).allow(null).optional(),

  // Multa Art. 467 CLT
  aplicarMulta467: Joi.boolean().default(false),
  multa467BaseVerbas: Joi.array().items(Joi.string()).default([]),

  // Períodos detalhados de férias e 13º (definidos pelo usuário)
  periodosFerias: Joi.array().items(Joi.object().unknown(true)).default([]),
  periodosDecimoTerceiro: Joi.array().items(Joi.object().unknown(true)).default([]),

  // Honorários e despesas processuais
  aplicarHonorariosPericiais: Joi.boolean().default(false),
  honorariosPericiaisValor: Joi.number().min(0).default(0),
  aplicarCustas: Joi.boolean().default(false),
}).options({ allowUnknown: false });

const schemaSimular = Joi.object({
  dados: schemaDadosContrato.required(),
  modalidade: Joi.string()
    .valid('sem_justa_causa', 'pedido_demissao', 'culpa_reciproca', 'rescisao_indireta', 'justa_causa')
    .required(),
});

// Schema para simulação de 3 modalidades simultâneas (sem justa causa, pedido demissão, culpa recíproca)
const schemaSimularMultiplo = Joi.object({
  dados: schemaDadosContrato.required(),
});

const schemaSalvarSimulacao = Joi.object({
  nome: Joi.string().min(3).max(255).required(),
  descricao: Joi.string().max(1000).allow('', null).optional(),
  modalidade: Joi.string().valid('sem_justa_causa', 'pedido_demissao', 'culpa_reciproca', 'rescisao_indireta', 'justa_causa').required(),
  dados: schemaDadosContrato.required(),
  resultado: Joi.object().optional(),
  numeroProcesso: Joi.string().max(50).allow('', null).optional(),
  varaNome: Joi.string().max(100).allow('', null).optional(),
  observacoes: Joi.string().max(2000).allow('', null).optional(),
  tags: Joi.array().items(Joi.string()).default([]),
});

function validar(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        erro: 'Dados inválidos',
        detalhes: error.details.map(d => ({ campo: d.path.join('.'), mensagem: d.message })),
      });
    }
    req.body = value;
    next();
  };
}

module.exports = { validar, schemaSimular, schemaSimularMultiplo, schemaSalvarSimulacao };
