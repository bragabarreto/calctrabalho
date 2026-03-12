'use strict';

module.exports = {
  SALARIO_MINIMO_2025: 1518.00,
  SALARIO_MINIMO_2026: 1622.00,

  FGTS_ALIQUOTA: 0.08,

  MULTA_FGTS_SJC: 0.40,
  MULTA_FGTS_RECIPROCA: 0.20,
  MULTA_FGTS_ACORDO: 0.20,

  AVISO_PREVIO_BASE_DIAS: 30,
  AVISO_PREVIO_ADICIONAL_ANO: 3,
  AVISO_PREVIO_MAXIMO_DIAS: 90,

  ADICIONAL_HE_MINIMO: 0.50,
  ADICIONAL_HE_DOMINGOS: 1.00,

  INSALUBRIDADE_MINIMO: 0.10,
  INSALUBRIDADE_MEDIO: 0.20,
  INSALUBRIDADE_MAXIMO: 0.40,

  PERICULOSIDADE: 0.30,

  HONORARIOS_SUCUMBENCIA_MIN: 0.05,
  HONORARIOS_SUCUMBENCIA_MAX: 0.15,

  DIVISOR_JORNADA_44H: 220,
  DIVISOR_JORNADA_36H: 180,
  DIVISOR_JORNADA_12X36: 220,

  PRESCRICAO_ANOS: 5,
  PRESCRICAO_BIENAL: 2,

  INSS_ALIQUOTA_ACORDO_PF: 0.11,
  INSS_ALIQUOTA_ACORDO_PJ: 0.28,

  // Tabela INSS 2025 (progressiva)
  INSS_TABELA_2025: [
    { ate: 1518.00, aliquota: 0.075 },
    { ate: 2793.88, aliquota: 0.09 },
    { ate: 4190.83, aliquota: 0.12 },
    { ate: 8157.41, aliquota: 0.14 },
  ],
  INSS_TETO_2025: 908.86,

  // Tabela IR 2025 (mensal) — tabela progressiva
  IR_TABELA_2025: [
    { ate: 2259.20, aliquota: 0,     deducao: 0 },
    { ate: 2826.65, aliquota: 0.075, deducao: 169.44 },
    { ate: 3751.05, aliquota: 0.15,  deducao: 381.44 },
    { ate: 4664.68, aliquota: 0.225, deducao: 662.77 },
    { ate: Infinity, aliquota: 0.275, deducao: 896.00 },
  ],
  IR_DEDUCAO_DEPENDENTE: 189.59, // por dependente/mês 2025

  MODALIDADES: {
    SEM_JUSTA_CAUSA: 'sem_justa_causa',
    PEDIDO_DEMISSAO: 'pedido_demissao',
    CULPA_RECIPROCA: 'culpa_reciproca',
    RESCISAO_INDIRETA: 'rescisao_indireta',
    JUSTA_CAUSA: 'justa_causa',
  },
};
