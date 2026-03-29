-- Migration 007: Adiciona campos de honorários periciais, custas e juros SELIC
-- às simulações para que o PDF possa recuperá-los sem re-executar o cálculo.

ALTER TABLE simulacoes
  ADD COLUMN IF NOT EXISTS aplicar_honorarios_periciais BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS honorarios_periciais_valor    NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aplicar_custas                BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS total_liquido                 NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS honorarios_valor              NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS honorarios_periciais_calculado NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custas_valor                  NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_com_honorarios          NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS juros_selic_valor             NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_devido_reclamado        NUMERIC(12,2) DEFAULT 0;
