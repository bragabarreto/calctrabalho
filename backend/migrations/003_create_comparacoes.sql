-- =============================================================
-- MIGRATION 003: Comparações entre cenários
-- =============================================================
CREATE TABLE IF NOT EXISTS comparacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  simulacao_ids UUID[] NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
