-- Migration 012: Adiciona template_id em parcelas_personalizadas
-- Permite associar uma parcela salva ao template padrão que ela customiza,
-- suprimindo o template original da listagem de "Parcelas Padrão" para evitar duplicatas visuais.

ALTER TABLE parcelas_personalizadas
  ADD COLUMN IF NOT EXISTS template_id VARCHAR(60);

CREATE INDEX IF NOT EXISTS idx_parcelas_template_id ON parcelas_personalizadas(template_id)
  WHERE template_id IS NOT NULL;
