-- Migration 010: Corrige valores de salário mínimo no seed
-- Fonte: Planalto.gov.br / Previdenciarista.com (atualizado jan/2026)
-- Erros corrigidos:
--   1. Jan/2026: era 1518.00 (copiado de 2025), deve ser 1621.00 (Decreto 12.797/2025)
--   2. Jan/2020: era 1045.00 (valor de fev/2020), deve ser 1039.00 (MP 916/2019)
--   3. Abr/1999: seed usava >= '1999-05-01', vigência real é 01/04/1999

-- Fix 1: Jan–Dez/2026 = R$ 1.621,00 (Decreto 12.797/2025, vigor 01/01/2026)
UPDATE salario_minimo_historico
SET valor = 1621.00
WHERE mes_ano >= '2026-01-01';

-- Fix 2: Jan/2020 = R$ 1.039,00 (MP 916/2019, vigor 01/01/2020)
--         Fev-Dez/2020 = R$ 1.045,00 (MP 919/2020, vigor 01/02/2020) — já correto no seed
INSERT INTO salario_minimo_historico (mes_ano, valor)
VALUES ('2020-01-01', 1039.00)
ON CONFLICT (mes_ano) DO UPDATE SET valor = 1039.00;

-- Fix 3: Abr/1999 = R$ 136,00 (MP 1.906/1999, vigor 01/04/1999 — não maio)
INSERT INTO salario_minimo_historico (mes_ano, valor)
VALUES ('1999-04-01', 136.00)
ON CONFLICT (mes_ano) DO UPDATE SET valor = 136.00;
