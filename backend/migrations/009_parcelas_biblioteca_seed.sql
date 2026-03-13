-- Migration 009: Adiciona campo previdência privada e seed da biblioteca de parcelas

-- Adicionar campo previdência privada na tabela
ALTER TABLE parcelas_personalizadas
  ADD COLUMN IF NOT EXISTS incide_previdencia_privada BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS aliquota_previdencia_privada NUMERIC(6,4);

-- Marcar parcelas da biblioteca (pré-definidas pelo sistema)
ALTER TABLE parcelas_personalizadas
  ADD COLUMN IF NOT EXISTS eh_biblioteca BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS descricao TEXT;

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
