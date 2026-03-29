-- =============================================================
-- MIGRATION 004: Tabelas de referência
-- =============================================================
CREATE TABLE IF NOT EXISTS salario_minimo_historico (
  mes_ano DATE PRIMARY KEY,
  valor NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS feriados_nacionais (
  data DATE PRIMARY KEY,
  nome VARCHAR(200) NOT NULL,
  tipo VARCHAR(50) DEFAULT 'nacional'
);

CREATE TABLE IF NOT EXISTS selic_historico (
  mes_ano DATE PRIMARY KEY,
  taxa_anual NUMERIC(10,4) NOT NULL,
  taxa_mensal NUMERIC(10,6)
);
