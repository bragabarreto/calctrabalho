---
name: calctrabalho-correcoes
description: Skill para revisão, correção e verificação de cálculos trabalhistas e seus parâmetros no aplicativo CalcTrabalho. Use para garantir a conformidade com a legislação brasileira, súmulas e OJs do TST, e para gerenciar a biblioteca de parcelas personalizadas.
license: Complete terms in LICENSE.txt
---

# CalcTrabalho - Correções e Verificações

Esta skill fornece diretrizes, manuais e fluxos de trabalho para aprimorar, corrigir e verificar os cálculos trabalhistas no aplicativo `calctrabalho`. O objetivo é garantir a máxima precisão de acordo com a legislação brasileira e a jurisprudência do Tribunal Superior do Trabalho (TST).

## Visão Geral do Aplicativo

O `calctrabalho` é um sistema web (Node.js + PostgreSQL + React) para simulação de cálculos trabalhistas. Ele possui um motor de cálculo complexo (`backend/src/services/calculo/engine.js`) que processa diversas verbas e seus reflexos.

Um dos pilares do sistema é a **Biblioteca de Parcelas**, que permite o cadastro de parcelas personalizadas com parâmetros flexíveis, adaptando-se a inúmeras situações não previstas inicialmente.

## Fluxos de Trabalho Principais

### 1. Revisão e Correção de Verbas Nativas

Ao revisar ou corrigir uma verba nativa (ex: Horas Extras, Insalubridade, Férias), siga este fluxo:

1. **Identifique a verba:** Localize o arquivo correspondente em `backend/src/services/calculo/verbas/`.
2. **Consulte o Manual:** Leia o arquivo de referência apropriado em `references/` para entender as regras de negócio, bases de cálculo e reflexos exigidos pelo TST.
3. **Verifique a Lógica:** Analise se o código atual respeita as regras (ex: divisor de jornada correto, base de cálculo incluindo parcelas salariais, reflexos adequados).
4. **Ajuste o Motor:** Se necessário, ajuste como a verba é chamada no `engine.js`.
5. **Teste:** Certifique-se de que a memória de cálculo (`memoria.formula`) reflete claramente a alteração para fins de auditoria.

### 2. Gerenciamento da Biblioteca de Parcelas

O aplicativo possui um sistema robusto de parcelas personalizadas (`parcelas_personalizadas`). Ao criar ou revisar os parâmetros de uma parcela:

1. **Consulte a Estrutura:** Leia `references/parametros_parcelas.md` para entender os campos obrigatórios e as opções disponíveis.
2. **Classificação Temática:** As parcelas devem ser classificadas conforme os grupos definidos no manual (Verbas rescisórias, Curso regular do contrato, Duração do Trabalho, etc.).
3. **Verificação de Parâmetros:** Toda parcela deve ter, no mínimo:
   - Nome
   - Base normativa (descrição/fundamento)
   - Base de cálculo (informada ou calculada)
   - Natureza (salarial ou indenizatória)
   - Gera reflexos (sim/não e em quais parcelas)
   - Periodicidade (única, horária, diária, semanal, mensal, semestral, anual)
   - Período de vigência (todo o contrato ou específico)
4. **Edição:** Os parâmetros devem ser editáveis pelo usuário, tanto na biblioteca geral (afeta todos os cálculos futuros) quanto na simulação em curso (afeta apenas o cálculo atual).

## Referências e Manuais

Para garantir a precisão dos cálculos, consulte os manuais detalhados incluídos nesta skill:

- **[Manual de Parcelas e Reflexos](references/manual_parcelas.md)**: Classificação temática das parcelas, regras de cálculo, bases normativas (CLT, Súmulas, OJs) e reflexos devidos.
- **[Parâmetros do Sistema](references/parametros_parcelas.md)**: Guia sobre como configurar os parâmetros das parcelas no banco de dados e na interface do usuário.

## Regras de Ouro para Cálculos Trabalhistas

1. **Natureza Jurídica:** Parcelas de natureza *salarial* geram reflexos (RSR, Férias, 13º, FGTS, Aviso Prévio). Parcelas de natureza *indenizatória* não geram reflexos.
2. **Base de Cálculo:** Verifique sempre o que compõe a base de cálculo de uma verba. Ex: Horas extras incidem sobre o salário base + adicionais de natureza salarial (Súmula 264 TST).
3. **Insalubridade vs. Periculosidade:** Insalubridade incide sobre o salário mínimo (Súmula 228 STF), salvo norma coletiva mais benéfica. Periculosidade incide sobre o salário base (Súmula 191 TST).
4. **Reflexos em Cascata (OJ 394 SDI-1 TST):** A majoração do valor do repouso semanal remunerado, em razão da integração das horas extras habitualmente prestadas, não repercute no cálculo das férias, da gratificação natalina, do aviso prévio e do FGTS, sob pena de caracterização de *bis in idem* (Atenção: o TST alterou este entendimento recentemente para fatos geradores a partir de 20/03/2023 - IRR-10169-57.2013.5.05.0024. Verifique a data do cálculo!).
5. **Prescrição:** Observe sempre a prescrição quinquenal (5 anos retroativos ao ajuizamento da ação).

## Comandos Úteis

Para verificar o esquema do banco de dados relacionado às parcelas:
```bash
cat backend/migrations/005_create_parcelas_personalizadas.sql
```

Para verificar as parcelas pré-cadastradas na biblioteca:
```bash
cat backend/migrations/009_parcelas_biblioteca_seed.sql
```
