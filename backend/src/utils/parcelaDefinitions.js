'use strict';

/**
 * Definições canônicas de incidências para verbas nativas do motor de cálculo.
 *
 * Baseado na legislação trabalhista brasileira (CLT, Súmulas e OJs do TST).
 * Quando o usuário customiza uma parcela na biblioteca durante um cálculo,
 * os overrides têm prioridade sobre estes defaults.
 *
 * Campos: natureza, incideFgts, incideInss, incideIr
 *
 * Cadeia de prioridade:
 *   1. overrides por cálculo (dados.verbasOverrides[codigo])
 *   2. parcela personalizada com templateId correspondente
 *   3. defaults abaixo (NATIVE_VERBA_DEFAULTS)
 */
const NATIVE_VERBA_DEFAULTS = {
  // ── Verbas Rescisórias ──────────────────────────────────────
  saldo_salarial:              { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  salarios_atrasados:          { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  comissoes_atrasadas:         { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  gorjetas_atrasadas:          { natureza: 'salarial',      incideFgts: false, incideInss: false, incideIr: false },
  aviso_previo:                { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  ferias_dobradas:             { natureza: 'salarial',      incideFgts: false, incideInss: false, incideIr: false },
  ferias_integrais:            { natureza: 'salarial',      incideFgts: false, incideInss: false, incideIr: false },
  ferias_proporcionais:        { natureza: 'salarial',      incideFgts: false, incideInss: false, incideIr: false },
  decimo_terceiro_integral:    { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  decimo_terceiro_proporcional:{ natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },

  // ── FGTS ────────────────────────────────────────────────────
  fgts_imprescrito:            { natureza: 'indenizatoria', incideFgts: false, incideInss: false, incideIr: false },
  multa_fgts:                  { natureza: 'indenizatoria', incideFgts: false, incideInss: false, incideIr: false },

  // ── Multas ──────────────────────────────────────────────────
  multa_art_467:               { natureza: 'indenizatoria', incideFgts: false, incideInss: false, incideIr: false },
  multa_art_477:               { natureza: 'indenizatoria', incideFgts: false, incideInss: false, incideIr: false },

  // ── Horas Extras + Reflexos ─────────────────────────────────
  horas_extras:                { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_he_rsr:              { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_he_aviso:            { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_he_ferias:           { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_he_13:               { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_he_fgts:             { natureza: 'indenizatoria', incideFgts: false, incideInss: false, incideIr: false },
  reflexo_he_mul_fgts:         { natureza: 'indenizatoria', incideFgts: false, incideInss: false, incideIr: false },

  // ── Intervalo Intrajornada ──────────────────────────────────
  intervalo_intrajornada:      { natureza: 'indenizatoria', incideFgts: false, incideInss: false, incideIr: false },
  intervalo_interjornada:      { natureza: 'indenizatoria', incideFgts: false, incideInss: false, incideIr: false },

  // ── Adicional Noturno + Reflexos ────────────────────────────
  adicional_noturno:           { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_an_rsr:              { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_an_aviso:            { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_an_ferias:           { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_an_13:               { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_an_fgts:             { natureza: 'indenizatoria', incideFgts: false, incideInss: false, incideIr: false },
  reflexo_an_mul_fgts:         { natureza: 'indenizatoria', incideFgts: false, incideInss: false, incideIr: false },

  // ── Insalubridade + Reflexos ────────────────────────────────
  insalubridade:               { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_ins_aviso:           { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_ins_ferias:          { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_ins_13:              { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_ins_fgts:            { natureza: 'indenizatoria', incideFgts: false, incideInss: false, incideIr: false },
  reflexo_ins_mul_fgts:        { natureza: 'indenizatoria', incideFgts: false, incideInss: false, incideIr: false },

  // ── Periculosidade + Reflexos ───────────────────────────────
  periculosidade:              { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_per_aviso:           { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_per_ferias:          { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_per_13:              { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_per_fgts:            { natureza: 'indenizatoria', incideFgts: false, incideInss: false, incideIr: false },
  reflexo_per_mul_fgts:        { natureza: 'indenizatoria', incideFgts: false, incideInss: false, incideIr: false },

  // ── Dano Moral ──────────────────────────────────────────────
  dano_moral:                  { natureza: 'indenizatoria', incideFgts: false, incideInss: false, incideIr: false },

  // ── RSR Não Concedido + Reflexos ────────────────────────────
  rsr_nao_concedido:           { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_rsr_ferias:          { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_rsr_13:              { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_rsr_aviso:           { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_rsr_fgts:            { natureza: 'indenizatoria', incideFgts: false, incideInss: false, incideIr: false },
  reflexo_rsr_mul_fgts:        { natureza: 'indenizatoria', incideFgts: false, incideInss: false, incideIr: false },

  // ── Feriados Laborados + Reflexos ───────────────────────────
  feriados_laborados:          { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_fer_ferias:          { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_fer_13:              { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_fer_aviso:           { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_fer_fgts:            { natureza: 'indenizatoria', incideFgts: false, incideInss: false, incideIr: false },
  reflexo_fer_mul_fgts:        { natureza: 'indenizatoria', incideFgts: false, incideInss: false, incideIr: false },

  // ── Intervalo Térmico + Reflexos ────────────────────────────
  intervalo_termico:           { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_it_rsr:              { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_it_ferias:           { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_it_13:               { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_it_aviso:            { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_it_fgts:             { natureza: 'indenizatoria', incideFgts: false, incideInss: false, incideIr: false },
  reflexo_it_mul_fgts:         { natureza: 'indenizatoria', incideFgts: false, incideInss: false, incideIr: false },

  // ── Intervalo por Digitação + Reflexos ──────────────────────
  intervalo_digitacao:         { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_id_rsr:              { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_id_ferias:           { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_id_13:               { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_id_aviso:            { natureza: 'salarial',      incideFgts: true,  incideInss: true,  incideIr: true  },
  reflexo_id_fgts:             { natureza: 'indenizatoria', incideFgts: false, incideInss: false, incideIr: false },
  reflexo_id_mul_fgts:         { natureza: 'indenizatoria', incideFgts: false, incideInss: false, incideIr: false },
};

/**
 * Mapa de template_id da biblioteca → código de verba nativa no engine.
 * Permite que overrides de parcelas personalizadas afetem verbas nativas.
 */
const TEMPLATE_TO_CODE = {
  tpl_aviso_indenizado:    'aviso_previo',
  tpl_multa_477:           'multa_art_477',
  tpl_multa_467:           'multa_art_467',
  tpl_dano_moral:          'dano_moral',
  tpl_horas_extras:        'horas_extras',
  tpl_noturno:             'adicional_noturno',
  tpl_insalubridade:       'insalubridade',
  tpl_insalubridade_min:   'insalubridade',
  tpl_insalubridade_med:   'insalubridade',
  tpl_insalubridade_max:   'insalubridade',
  tpl_periculosidade:      'periculosidade',
  tpl_intervalo:           'intervalo_intrajornada',
  tpl_intervalo_inter:     'intervalo_interjornada',
  tpl_feriados:            'feriados_laborados',
};

/**
 * Resolve as flags de incidência para um código de verba.
 *
 * @param {string} codigo - Código da verba (ex: 'aviso_previo')
 * @param {Object} [overridesMap={}] - Mapa de overrides { codigo: { incideInss, incideFgts, natureza, incideIr } }
 * @returns {{ natureza: string, incideFgts: boolean, incideInss: boolean, incideIr: boolean }}
 */
function resolverIncidencias(codigo, overridesMap = {}) {
  const defaults = NATIVE_VERBA_DEFAULTS[codigo] || {
    natureza: 'salarial',
    incideFgts: false,
    incideInss: false,
    incideIr: false,
  };
  const override = overridesMap[codigo];
  if (!override) return { ...defaults };
  return {
    natureza:   override.natureza   ?? defaults.natureza,
    incideFgts: override.incideFgts ?? defaults.incideFgts,
    incideInss: override.incideInss ?? defaults.incideInss,
    incideIr:   override.incideIr   ?? defaults.incideIr,
  };
}

/**
 * Constrói o mapa de overrides a partir das parcelas personalizadas do cálculo.
 * Parcelas com templateId que mapeiam para verbas nativas terão suas flags
 * aplicadas em vez dos defaults do sistema.
 *
 * @param {Array} parcelasPersonalizadas - Array de parcelas personalizadas do cálculo
 * @param {Object} [verbasOverrides={}] - Overrides explícitos do usuário (prioridade máxima)
 * @returns {Object} Mapa { codigoVerba: { natureza, incideFgts, incideInss, incideIr } }
 */
function construirOverridesMap(parcelasPersonalizadas = [], verbasOverrides = {}) {
  const map = {};

  // 1. Aplicar overrides de parcelas personalizadas com templateId
  for (const p of parcelasPersonalizadas) {
    const tplId = p.templateId || p._templateId;
    if (tplId && TEMPLATE_TO_CODE[tplId]) {
      const code = TEMPLATE_TO_CODE[tplId];
      map[code] = {
        natureza:   p.natureza,
        incideFgts: p.incideFgts,
        incideInss: p.incideInss,
        incideIr:   p.incideIr,
      };
    }
  }

  // 2. Overrides explícitos do usuário (prioridade sobre tudo)
  for (const [code, flags] of Object.entries(verbasOverrides)) {
    map[code] = { ...(map[code] || {}), ...flags };
  }

  return map;
}

module.exports = {
  NATIVE_VERBA_DEFAULTS,
  TEMPLATE_TO_CODE,
  resolverIncidencias,
  construirOverridesMap,
};
