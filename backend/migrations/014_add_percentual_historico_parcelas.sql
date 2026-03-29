-- Migration 014: add percentual_historico to tipo_valor CHECK + add base_historico_id column

ALTER TABLE parcelas_personalizadas
  DROP CONSTRAINT IF EXISTS parcelas_personalizadas_tipo_valor_check;

ALTER TABLE parcelas_personalizadas
  ADD CONSTRAINT parcelas_personalizadas_tipo_valor_check
    CHECK (tipo_valor IN ('fixo','percentual_salario','percentual_sm','percentual_historico'));

ALTER TABLE parcelas_personalizadas
  ADD COLUMN IF NOT EXISTS base_historico_id TEXT;
