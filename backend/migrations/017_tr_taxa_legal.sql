-- Migration 017: Tabelas TR (Taxa Referencial) e Taxa Legal (Lei 14.905/2024)
-- TR = série BACEN 226 (diária, valor = taxa mensal a partir daquela data)
-- Taxa Legal = SELIC mensal − IPCA mensal, piso 0 (art. 406 CC)

CREATE TABLE IF NOT EXISTS tr_historico (
  mes_ano DATE PRIMARY KEY,
  valor NUMERIC(10,6) NOT NULL  -- taxa mensal em % (ex: 0.0875 = 0,0875%)
);

CREATE TABLE IF NOT EXISTS taxa_legal_historico (
  mes_ano DATE PRIMARY KEY,
  valor NUMERIC(10,6) NOT NULL  -- taxa mensal em % = max(0, SELIC_mensal − IPCA_mensal)
);
