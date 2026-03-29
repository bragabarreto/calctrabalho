-- Migration 015: Tabela de parâmetros INSS (progressiva, por vigência)
-- Permite configurar faixas de contribuição por ano sem alterar código

CREATE TABLE IF NOT EXISTS inss_parametros (
  id SERIAL PRIMARY KEY,
  vigencia_inicio DATE NOT NULL,
  vigencia_fim DATE,
  faixa_ordem INTEGER NOT NULL,
  limite_superior NUMERIC(10,2) NOT NULL,
  aliquota NUMERIC(6,4) NOT NULL,
  contribuicao_maxima NUMERIC(10,2),
  teto_contribuicao NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vigencia_inicio, faixa_ordem)
);

-- Seed: Tabela INSS 2025 (Portaria Interministerial MPS/MF nº 6/2025)
INSERT INTO inss_parametros (vigencia_inicio, faixa_ordem, limite_superior, aliquota, contribuicao_maxima, teto_contribuicao) VALUES
  ('2025-01-01', 1, 1518.00, 0.0750, 908.86, 8157.41),
  ('2025-01-01', 2, 2793.88, 0.0900, 908.86, 8157.41),
  ('2025-01-01', 3, 4190.83, 0.1200, 908.86, 8157.41),
  ('2025-01-01', 4, 8157.41, 0.1400, 908.86, 8157.41)
ON CONFLICT (vigencia_inicio, faixa_ordem) DO NOTHING;

-- Tabela de auditoria para alterações em índices e parâmetros
CREATE TABLE IF NOT EXISTS indices_audit_log (
  id SERIAL PRIMARY KEY,
  tabela VARCHAR(100) NOT NULL,
  acao VARCHAR(20) NOT NULL,
  dados_anteriores JSONB,
  dados_novos JSONB,
  usuario VARCHAR(100) DEFAULT 'sistema',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
