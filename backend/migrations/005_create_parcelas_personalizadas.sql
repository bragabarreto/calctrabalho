-- Migration 005: Parcelas Personalizadas
-- Substitui as parcelas genéricas por um sistema flexível e customizável

CREATE TABLE IF NOT EXISTS parcelas_personalizadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  natureza VARCHAR(20) NOT NULL CHECK (natureza IN ('salarial', 'indenizatoria')),

  -- Período de vigência
  periodo_tipo VARCHAR(20) NOT NULL DEFAULT 'contrato' CHECK (periodo_tipo IN ('contrato', 'especifico')),
  periodo_inicio DATE,
  periodo_fim DATE,

  -- Frequência de apuração
  frequencia VARCHAR(20) NOT NULL CHECK (frequencia IN ('horaria', 'diaria_6d', 'diaria_5d', 'mensal', 'semestral', 'anual', 'calculada', 'unica')),

  -- Valor base
  tipo_valor VARCHAR(20) NOT NULL DEFAULT 'fixo' CHECK (tipo_valor IN ('fixo', 'percentual_salario', 'percentual_sm')),
  valor_base NUMERIC(12,2),
  percentual_base NUMERIC(6,4),
  percentual_adicional NUMERIC(6,4) DEFAULT 0,

  -- Reflexos
  gera_reflexos BOOLEAN DEFAULT FALSE,
  reflexos_em TEXT[] DEFAULT '{}',

  -- Incidências
  incide_inss BOOLEAN DEFAULT FALSE,
  incide_ir BOOLEAN DEFAULT FALSE,
  incide_fgts BOOLEAN DEFAULT FALSE,

  -- Metadados
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parcelas_ativo ON parcelas_personalizadas(ativo);

-- Extensão na tabela simulacoes para suportar os novos campos
ALTER TABLE simulacoes
  ADD COLUMN IF NOT EXISTS tipo_fluxo VARCHAR(30) DEFAULT 'verbas_rescisórias',
  ADD COLUMN IF NOT EXISTS periodos_ferias JSONB,
  ADD COLUMN IF NOT EXISTS periodos_decimo_terceiro JSONB,
  ADD COLUMN IF NOT EXISTS parcelas_personalizadas_ids UUID[],
  ADD COLUMN IF NOT EXISTS deducoes_detalhadas JSONB,
  ADD COLUMN IF NOT EXISTS multa_467_base_verbas TEXT[];
