-- Migration 013: Adiciona coluna descricao em parcelas_personalizadas
-- Permite armazenar fundamento legal / descrição da parcela cadastrada na biblioteca.

ALTER TABLE parcelas_personalizadas
  ADD COLUMN IF NOT EXISTS descricao TEXT;
