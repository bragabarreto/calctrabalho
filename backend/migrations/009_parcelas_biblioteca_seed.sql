-- Migration 009: Adiciona campo previdência privada e seed da biblioteca de parcelas

-- Adicionar campo previdência privada na tabela
ALTER TABLE parcelas_personalizadas
  ADD COLUMN IF NOT EXISTS incide_previdencia_privada BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS aliquota_previdencia_privada NUMERIC(6,4);

-- Marcar parcelas da biblioteca (pré-definidas pelo sistema)
ALTER TABLE parcelas_personalizadas
  ADD COLUMN IF NOT EXISTS eh_biblioteca BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS descricao TEXT;

-- Antecipar template_id (originalmente na migration 012) para que seeds posteriores funcionem
ALTER TABLE parcelas_personalizadas
  ADD COLUMN IF NOT EXISTS template_id VARCHAR(60);
CREATE INDEX IF NOT EXISTS idx_parcelas_template_id ON parcelas_personalizadas(template_id)
  WHERE template_id IS NOT NULL;

-- Seed: parcelas pré-definidas da biblioteca trabalhista
INSERT INTO parcelas_personalizadas (
  nome, descricao, natureza, frequencia, tipo_valor,
  percentual_base, percentual_adicional,
  gera_reflexos, reflexos_em,
  incide_inss, incide_ir, incide_fgts,
  eh_biblioteca
) VALUES

-- Adicionais de insalubridade
('Insalubridade Grau Mínimo (10%)',
 'Art. 192 CLT. Base: salário mínimo × 10%. Exposto a agente insalubre em grau mínimo.',
 'salarial', 'mensal', 'percentual_sm',
 0.1000, 0,
 true, ARRAY['ferias','decimo_terceiro','fgts','aviso_previo'],
 true, true, true, true),

('Insalubridade Grau Médio (20%)',
 'Art. 192 CLT. Base: salário mínimo × 20%. Exposto a agente insalubre em grau médio.',
 'salarial', 'mensal', 'percentual_sm',
 0.2000, 0,
 true, ARRAY['ferias','decimo_terceiro','fgts','aviso_previo'],
 true, true, true, true),

('Insalubridade Grau Máximo (40%)',
 'Art. 192 CLT. Base: salário mínimo × 40%. Exposto a agente insalubre em grau máximo.',
 'salarial', 'mensal', 'percentual_sm',
 0.4000, 0,
 true, ARRAY['ferias','decimo_terceiro','fgts','aviso_previo'],
 true, true, true, true),

-- Periculosidade
('Adicional de Periculosidade (30%)',
 'Art. 193 CLT. Base: salário contratual × 30%. Atividade ou operação perigosa.',
 'salarial', 'mensal', 'percentual_salario',
 0.3000, 0,
 true, ARRAY['ferias','decimo_terceiro','fgts','aviso_previo','dsr'],
 true, true, true, true),

-- Sobreaviso e Prontidão
('Sobreaviso',
 'Art. 244 §2º CLT. Empregado permanece em casa aguardando convocação. 1/3 das horas.',
 'salarial', 'horaria', 'percentual_salario',
 0.3333, 0,
 true, ARRAY['ferias','decimo_terceiro','fgts'],
 true, true, true, true),

('Prontidão',
 'Art. 244 §3º CLT. Empregado permanece nas dependências do empregador. 2/3 das horas.',
 'salarial', 'horaria', 'percentual_salario',
 0.6667, 0,
 true, ARRAY['ferias','decimo_terceiro','fgts'],
 true, true, true, true),

-- Adicional de transferência
('Adicional de Transferência (25%)',
 'Art. 469 §3º CLT. Transferência provisória a critério do empregador. 25% do salário.',
 'salarial', 'mensal', 'percentual_salario',
 0.2500, 0,
 true, ARRAY['ferias','decimo_terceiro','fgts'],
 true, true, true, true),

-- Gratificação de função
('Gratificação de Função',
 'Adicional pelo exercício de cargo de confiança ou função gratificada.',
 'salarial', 'mensal', 'percentual_salario',
 0.0000, 0,
 true, ARRAY['ferias','decimo_terceiro','fgts','aviso_previo','dsr'],
 true, true, true, true),

-- Parcelas indenizatórias
('Ticket Alimentação / Vale Refeição',
 'Parcela indenizatória. Não integra salário (OJ 133 SDI1 TST). Não incide INSS/FGTS/IR.',
 'indenizatoria', 'mensal', 'fixo',
 NULL, 0,
 false, ARRAY[]::text[],
 false, false, false, true),

('Vale Transporte (diferença não paga)',
 'Lei 7.418/1985. Indenizatório. Diferença entre valor devido e valor pago.',
 'indenizatoria', 'mensal', 'fixo',
 NULL, 0,
 false, ARRAY[]::text[],
 false, false, false, true),

('Ajuda de Custo',
 'Parcela indenizatória paga ao empregado para ressarcimento de despesas.',
 'indenizatoria', 'mensal', 'fixo',
 NULL, 0,
 false, ARRAY[]::text[],
 false, false, false, true),

('Quebra de Caixa',
 'Indenização para cobertura de diferenças de caixa. Natureza indenizatória (Súm. 247 TST).',
 'indenizatoria', 'mensal', 'fixo',
 NULL, 0,
 false, ARRAY[]::text[],
 false, false, false, true),

-- PLR
('PLR / Participação nos Lucros',
 'Lei 10.101/2000. Não integra salário. Incide IR separado (tabela própria).',
 'indenizatoria', 'semestral', 'fixo',
 NULL, 0,
 false, ARRAY[]::text[],
 false, true, false, true),

-- DSR sobre variáveis
('RSR/DSR sobre Variáveis',
 'Súm. 172 TST. Repouso semanal sobre comissões/horas extras/outras variáveis.',
 'salarial', 'mensal', 'percentual_salario',
 0.1667, 0,
 true, ARRAY['ferias','decimo_terceiro','fgts'],
 true, true, true, true),

-- Adicional noturno (template para uso em parcelasPersonalizadas)
('Adicional Noturno (20%)',
 'Art. 73 CLT. Hora noturna reduzida (52min30s). Adicional de 20% sobre hora diurna.',
 'salarial', 'horaria', 'percentual_salario',
 0.2000, 0,
 true, ARRAY['ferias','decimo_terceiro','fgts','dsr'],
 true, true, true, true),

-- Horas extras templates
('Horas Extras 50%',
 'Art. 59 CLT. Horas acima da jornada contratual. Adicional mínimo de 50%.',
 'salarial', 'horaria', 'percentual_salario',
 1.0000, 0.5000,
 true, ARRAY['ferias','decimo_terceiro','fgts','aviso_previo','dsr'],
 true, true, true, true),

('Horas Extras 100%',
 'Constituição Federal art. 7º XVI (feriados/folgas). Adicional de 100%.',
 'salarial', 'horaria', 'percentual_salario',
 1.0000, 1.0000,
 true, ARRAY['ferias','decimo_terceiro','fgts','aviso_previo','dsr'],
 true, true, true, true)

ON CONFLICT DO NOTHING;

-- ── Novas parcelas da biblioteca ────────────────────────────────────────────

-- Desvio/Acúmulo de Função
INSERT INTO parcelas_personalizadas (id, nome, descricao, natureza, frequencia, tipo_valor, percentual_base, gera_reflexos, reflexos_em, incide_inss, incide_ir, incide_fgts, ativo, eh_biblioteca, template_id)
VALUES (gen_random_uuid(), 'Desvio/Acúmulo de Função', 'Art. 461 CLT + Súmula 159 TST. Diferença salarial devida pelo exercício de função superior sem promoção formal.', 'salarial', 'mensal', 'percentual_salario', 0, true, ARRAY['rsr','ferias','decimo_terceiro','fgts','aviso_previo'], true, true, true, true, true, 'tpl_desvio_funcao')
ON CONFLICT DO NOTHING;

-- Equiparação Salarial
INSERT INTO parcelas_personalizadas (id, nome, descricao, natureza, frequencia, tipo_valor, percentual_base, gera_reflexos, reflexos_em, incide_inss, incide_ir, incide_fgts, ativo, eh_biblioteca, template_id)
VALUES (gen_random_uuid(), 'Equiparação Salarial', 'Art. 461 CLT. Diferença salarial entre reclamante e paradigma que exerce função idêntica.', 'salarial', 'mensal', 'fixo', 0, true, ARRAY['rsr','ferias','decimo_terceiro','fgts','aviso_previo'], true, true, true, true, true, 'tpl_equiparacao')
ON CONFLICT DO NOTHING;

-- Comissões Retidas
INSERT INTO parcelas_personalizadas (id, nome, descricao, natureza, frequencia, tipo_valor, percentual_base, gera_reflexos, reflexos_em, incide_inss, incide_ir, incide_fgts, ativo, eh_biblioteca, template_id)
VALUES (gen_random_uuid(), 'Comissões Retidas', 'Art. 457 §1º CLT. Comissões devidas e não pagas no curso do contrato.', 'salarial', 'mensal', 'fixo', 0, true, ARRAY['rsr','ferias','decimo_terceiro','fgts','aviso_previo'], true, true, true, true, true, 'tpl_comissoes_retidas')
ON CONFLICT DO NOTHING;

-- Gorjetas Retidas
INSERT INTO parcelas_personalizadas (id, nome, descricao, natureza, frequencia, tipo_valor, percentual_base, gera_reflexos, reflexos_em, incide_inss, incide_ir, incide_fgts, ativo, eh_biblioteca, template_id)
VALUES (gen_random_uuid(), 'Gorjetas Retidas', 'Art. 457 CLT + Súmula 354 TST. Gorjetas integram a remuneração mas não servem de base para aviso prévio, AN, HE e RSR.', 'salarial', 'mensal', 'fixo', 0, true, ARRAY['ferias','decimo_terceiro','fgts'], true, true, true, true, true, 'tpl_gorjetas_retidas')
ON CONFLICT DO NOTHING;

-- Adicional por Tempo de Serviço
INSERT INTO parcelas_personalizadas (id, nome, descricao, natureza, frequencia, tipo_valor, percentual_base, gera_reflexos, reflexos_em, incide_inss, incide_ir, incide_fgts, ativo, eh_biblioteca, template_id)
VALUES (gen_random_uuid(), 'Adicional por Tempo de Serviço (Anuênio/Quinquênio)', 'Adicional previsto em norma coletiva ou regulamento interno. Base: percentual sobre salário por ano de serviço.', 'salarial', 'mensal', 'percentual_salario', 1, true, ARRAY['rsr','ferias','decimo_terceiro','fgts','aviso_previo'], true, true, true, true, true, 'tpl_anuenio')
ON CONFLICT DO NOTHING;

-- ── Atualizar descrições de parcelas existentes que possam estar sem descrição ──

UPDATE parcelas_personalizadas SET descricao = 'Art. 192 CLT + Súmula 228 TST/STF. Base: salário mínimo vigente. Grau mínimo (10%), médio (20%) ou máximo (40%).'
WHERE template_id LIKE 'tpl_insalubridade%' AND (descricao IS NULL OR descricao = '');

UPDATE parcelas_personalizadas SET descricao = 'Art. 193 CLT. Base: salário contratual x 30%. Atividade ou operação perigosa (inflamáveis, explosivos, eletricidade, etc.).'
WHERE template_id = 'tpl_periculosidade' AND (descricao IS NULL OR descricao = '');

UPDATE parcelas_personalizadas SET descricao = 'Art. 59 CLT. Horas excedentes à jornada contratual. Adicional mínimo de 50% sobre hora normal.'
WHERE template_id = 'tpl_horas_extras' AND (descricao IS NULL OR descricao = '');

UPDATE parcelas_personalizadas SET descricao = 'CF art. 7º, XVI. Adicional de 100% para trabalho em domingos e feriados.'
WHERE template_id = 'tpl_horas_extras_100' AND (descricao IS NULL OR descricao = '');

UPDATE parcelas_personalizadas SET descricao = 'Art. 73 CLT. Trabalho noturno (22h-5h). Hora noturna reduzida (52min30s). Adicional de 20%.'
WHERE template_id = 'tpl_noturno' AND (descricao IS NULL OR descricao = '');

UPDATE parcelas_personalizadas SET descricao = 'Art. 244 §2º CLT / Súmula 428 TST. Empregado permanece em casa aguardando convocação. Remunerado em 1/3 do valor-hora.'
WHERE template_id = 'tpl_sobreaviso' AND (descricao IS NULL OR descricao = '');

UPDATE parcelas_personalizadas SET descricao = 'Art. 244 §3º CLT. Empregado permanece nas dependências do empregador aguardando ordens. Remunerado em 2/3 do valor-hora.'
WHERE template_id = 'tpl_prontidao' AND (descricao IS NULL OR descricao = '');

UPDATE parcelas_personalizadas SET descricao = 'Art. 71 CLT / Súmula 437 TST. Supressão do intervalo intrajornada. Natureza salarial com reflexos.'
WHERE template_id = 'tpl_intervalo' AND (descricao IS NULL OR descricao = '');

UPDATE parcelas_personalizadas SET descricao = 'Art. 469 §3º CLT. Adicional de 25% do salário durante transferência provisória.'
WHERE template_id = 'tpl_transferencia' AND (descricao IS NULL OR descricao = '');

UPDATE parcelas_personalizadas SET descricao = 'Adicional pelo exercício de cargo de confiança ou função gratificada (art. 62, II, CLT). Reflexos integrais.'
WHERE template_id = 'tpl_gratificacao_funcao' AND (descricao IS NULL OR descricao = '');

UPDATE parcelas_personalizadas SET descricao = 'OJ 133 SDI-1 TST / PAT. Parcela indenizatória — não integra salário, sem incidência de INSS/FGTS/IR.'
WHERE template_id = 'tpl_ticket_alimentacao' AND (descricao IS NULL OR descricao = '');

UPDATE parcelas_personalizadas SET descricao = 'Lei 7.418/85. Parcela indenizatória. Diferença entre o valor devido e o efetivamente pago.'
WHERE template_id = 'tpl_vale_transporte' AND (descricao IS NULL OR descricao = '');

UPDATE parcelas_personalizadas SET descricao = 'Art. 457 §2º CLT. Parcela indenizatória para ressarcimento de despesas. Não integra salário.'
WHERE template_id = 'tpl_ajuda_custo' AND (descricao IS NULL OR descricao = '');

UPDATE parcelas_personalizadas SET descricao = 'Súmula 247 TST. Indenização para cobertura de diferenças de caixa. Natureza indenizatória.'
WHERE template_id = 'tpl_quebra_caixa' AND (descricao IS NULL OR descricao = '');

UPDATE parcelas_personalizadas SET descricao = 'Lei 10.101/2000. Não integra salário. Não incide INSS/FGTS. Incide IR por tabela específica.'
WHERE template_id = 'tpl_plr' AND (descricao IS NULL OR descricao = '');

UPDATE parcelas_personalizadas SET descricao = 'Súmula 172 TST. Repouso semanal remunerado sobre parcelas variáveis. Padrão: 1/6 = 16,67%.'
WHERE template_id = 'tpl_rsr_dsr' AND (descricao IS NULL OR descricao = '');
