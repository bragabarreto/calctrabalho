-- Migration 006: Histórico salarial do reclamante/paradigma
-- Permite registrar a evolução salarial para cálculos de diferenças

CREATE TABLE IF NOT EXISTS historico_salarial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulacao_id UUID REFERENCES simulacoes(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('reclamante', 'paradigma')),
  competencia DATE NOT NULL,           -- primeiro dia do mês (ex: 2022-01-01)
  salario NUMERIC(12,2) NOT NULL,
  observacao TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(simulacao_id, tipo, competencia)
);

CREATE INDEX IF NOT EXISTS idx_historico_salarial_simulacao ON historico_salarial(simulacao_id);

-- Tabela de configurações da conta (parâmetros personalizados por usuário/escritório)
CREATE TABLE IF NOT EXISTS configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave VARCHAR(100) NOT NULL UNIQUE,
  valor JSONB NOT NULL,
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Insere configurações padrão
INSERT INTO configuracoes (chave, valor) VALUES
  ('salario_minimo', '{"2025": 1518.00, "2024": 1412.00, "2023": 1320.00}'::jsonb),
  ('percentual_honorarios_padrao', '0.15'::jsonb),
  ('divisor_jornada_padrao', '220'::jsonb)
ON CONFLICT (chave) DO NOTHING;
