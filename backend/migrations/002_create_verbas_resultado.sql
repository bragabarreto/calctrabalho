-- =============================================================
-- MIGRATION 002: Resultado detalhado de cada simulação
-- =============================================================
CREATE TABLE IF NOT EXISTS resultado_verbas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulacao_id UUID NOT NULL REFERENCES simulacoes(id) ON DELETE CASCADE,

  codigo VARCHAR(100) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(100),
  natureza VARCHAR(20),
  incide_fgts BOOLEAN DEFAULT FALSE,
  incide_inss BOOLEAN DEFAULT FALSE,

  valor_bruto NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_considerado BOOLEAN DEFAULT TRUE,

  memoria_calculo JSONB,
  formula_descricao TEXT,

  gera_reflexos BOOLEAN DEFAULT FALSE,
  reflexos_ids UUID[],

  ordem_exibicao INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resultado_verbas_simulacao ON resultado_verbas(simulacao_id);
CREATE INDEX IF NOT EXISTS idx_resultado_verbas_codigo ON resultado_verbas(codigo);
