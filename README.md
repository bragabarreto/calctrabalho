# CalcTrabalho — Sistema de Simulação de Cálculos Trabalhistas

Sistema web profissional para simulação de cálculos trabalhistas brasileiros.
**Stack:** Node.js + PostgreSQL + React | **Uso:** Gabinete Judicial

---

## Pré-requisitos

1. **Node.js 20+** — https://nodejs.org/en/download
   _(Baixe o instalador Windows e execute)_
2. **Docker Desktop** — https://www.docker.com/products/docker-desktop
   _(Para o PostgreSQL — alternativa: instalar PostgreSQL diretamente)_

---

## Instalação e execução

### 1. Banco de dados (PostgreSQL via Docker)

```bash
cd calctrabalho
docker-compose up -d
```

Aguarde o container iniciar (~30s). PgAdmin disponível em http://localhost:5050
(login: admin@calctrabalho.local / admin123)

### 2. Backend

```bash
cd calctrabalho/backend
copy .env.example .env        # Windows CMD
# ou:
cp .env.example .env           # Git Bash

npm install
npm run migrate                # Cria as tabelas
npm run seed                   # Insere dados de referência (salário mínimo, feriados, Selic)
npm run dev                    # Servidor na porta 3001
```

### 3. Frontend

```bash
cd calctrabalho/frontend
npm install
npm run dev                    # Interface na porta 5173
```

Acesse: **http://localhost:5173**

---

## Estrutura do Projeto

```
calctrabalho/
├── backend/
│   ├── src/
│   │   ├── server.js                    # Entry point Express
│   │   ├── config/
│   │   │   ├── database.js              # Pool PostgreSQL
│   │   │   └── constants.js             # Alíquotas, limites legais
│   │   ├── routes/                      # calculos, simulacoes, comparacoes, pdf
│   │   ├── controllers/                 # Lógica de cada rota
│   │   ├── services/
│   │   │   ├── calculo/
│   │   │   │   ├── engine.js            # Motor central de cálculo
│   │   │   │   └── verbas/              # Um arquivo por verba
│   │   │   └── pdf/                     # Geração de relatório PDF
│   │   ├── middlewares/                 # validação Joi, errorHandler
│   │   └── utils/                       # datas, formatação, auditoria
│   ├── migrations/                      # SQL de criação das tabelas
│   └── seeds/                           # Dados históricos
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── Calculadora/             # Formulário multi-step (5 etapas)
        │   ├── Historico/               # Lista e detalhe de simulações salvas
        │   ├── Comparacao/              # Seleção e painel comparativo
        │   └── Configuracoes/           # Tabelas legais vigentes
        ├── components/
        │   ├── MemoriaCalculo/          # Tabela auditável com fórmulas expansíveis
        │   └── ExportBar/               # Salvar e exportar PDF
        ├── hooks/                       # useCalculo, useSimulacao, useComparacao
        └── store/calculoStore.js        # Estado global (Zustand)
```

---

## Funcionalidades

### Calculadora (5 etapas)
1. **Dados do Contrato** — datas, modalidade, salário
2. **Verbas** — férias vencidas, 13º, deduções, parcelas genéricas
3. **Adicionais** — insalubridade (10/20/40%), periculosidade (30%)
4. **Jornada** — horas extras, adicional noturno, intervalo intrajornada
5. **Resultado** — memória de cálculo completa com fórmulas detalhadas

### Modalidades de Rescisão
| Modalidade | Aviso | Multa FGTS |
|---|---|---|
| Sem justa causa | 100% | 40% |
| Rescisão indireta | 100% | 40% |
| Culpa recíproca | 50% | 20% |
| Pedido de demissão | Não | 0% |
| Justa causa | Não | 0% |

### Verbas Calculadas (+ reflexos)
- Saldo salarial, salários/comissões atrasados
- Aviso prévio (projetado: 30 + 3 dias/ano, máx 90)
- Férias dobradas/integrais/proporcionais + 1/3
- 13º integral e proporcional
- FGTS (8%) + multa rescisória
- Multas arts. 467 e 477 CLT
- Horas extras + reflexos em RSR, férias, 13º, FGTS
- Adicional noturno + reflexos
- Insalubridade sobre histórico do salário mínimo + reflexos
- Periculosidade + reflexos
- Intervalo intrajornada
- Parcelas genéricas salariais/indenizatórias
- Prescrição quinquenal automática (EC 45/2004)

### Comparação de Cenários
- Até 4 simulações lado a lado
- Destaque automático: verde = maior, vermelho = menor
- Diferença absoluta e percentual entre extremos

### Exportação PDF
- Memória de cálculo formatada como documento judicial
- Gerado via Puppeteer (headless Chrome)
- Inclui todos os passos e fórmulas

---

## API REST

| Método | Endpoint | Descrição |
|---|---|---|
| POST | /api/calculos/simular | Calcular sem salvar |
| POST | /api/simulacoes | Salvar simulação |
| GET | /api/simulacoes | Listar com filtros |
| GET | /api/simulacoes/:id | Detalhe completo |
| DELETE | /api/simulacoes/:id | Excluir |
| POST | /api/comparacoes | Criar comparação |
| GET | /api/comparacoes/:id | Painel comparativo |
| POST | /api/pdf/gerar/:id | Gerar PDF |
| GET | /api/health | Status da API |

---

## Avisos Legais Exibidos pelo Sistema

- Marco prescricional (5 anos — EC 45/2004 e Súmula 308 TST)
- Base de cálculo da insalubridade (Súmula 228 STF/TST)
- Divisor de jornada (verificar CCT — Súmula 431 TST para bancários)
- Aviso de simulação em todos os documentos gerados

---

## Parâmetros Legais (2025–2026)

- **Salário mínimo 2025:** R$ 1.518,00
- **Salário mínimo 2026:** R$ 1.622,00 (projeção)
- **INSS teto 2025:** R$ 908,86
- **Selic:** Histórico de 1994 a 2026 (seed incluído)
- **Feriados nacionais:** 2000 a 2030 (seed incluído)
- **Salário mínimo histórico:** 1994 a 2026 (seed incluído)

---

## Conformidade Legal e Parâmetros

### INSS — Tabela Progressiva 2025

(Portaria Interministerial MPS/MF n. 6/2025)

| Faixa | Salário de contribuição | Alíquota |
|---|---|---|
| 1 | Até R$ 1.518,00 | 7,5% |
| 2 | R$ 1.518,01 a R$ 2.793,88 | 9% |
| 3 | R$ 2.793,89 a R$ 4.190,83 | 12% |
| 4 | R$ 4.190,84 a R$ 8.157,41 | 14% |

- **Teto da base de contribuição (salário-de-contribuição máximo):** R$ 8.157,41
- **Contribuição máxima do empregado (resultado progressivo):** R$ 908,86

> Atenção: o teto de contribuição (R$ 8.157,41) é a base máxima sobre a qual incide o INSS. A contribuição máxima efetiva (R$ 908,86) resulta da aplicação progressiva das alíquotas sobre cada faixa.

### Regras Legais Aplicadas

| Referência | Descrição |
|---|---|
| OJ 394 SDI-1 TST | RSR majorado por HE repercute em férias, 13o, aviso prévio e FGTS (fatos geradores a partir de 20/03/2023) |
| OJ 82 SDI-1 TST | Aviso prévio indenizado projeta para cálculo de 13o proporcional |
| Súmula 172 TST | Reflexo de horas extras habituais nas férias (+ 1/3) |
| Súmula 354 TST | Gorjetas não integram base para aviso prévio, horas extras, etc., mas integram remuneração para multas 467/477 |
| Súmula 228 TST/STF | Base de cálculo da insalubridade: salário mínimo |
| Súmula 308 TST | Prescrição quinquenal — marco de 5 anos da data de ajuizamento |
| Súmula 431 TST | Divisor de jornada 180h para bancários (jornada de 6h) |
| OJ 181 SDI-1 TST | Composição da base rescisória (parcelas variáveis) |
| ADC 58 STF | Correção monetária: IPCA-E até jun/2009, depois TR/SELIC conforme fase |
| Art. 457 §1o CLT | Remuneração inclui salário, gorjetas e habituais |
| Art. 467 CLT | Multa de 100% sobre verbas incontroversas não pagas na primeira audiência |
| Art. 477 §8o CLT | Multa de 1 remuneração por atraso nas verbas rescisórias (prazo: 10 dias) |
| Art. 12-A Lei 7.713/88 | IR sobre rendimentos acumulados pelo método RRA |

### Atualização de Índices

Os índices de correção monetária (Selic, IPCA-E) e tabelas legais podem ser atualizados de duas formas:

1. **Interface:** Acesse **Configurações > Índices de Correção** e utilize o botão de sincronização com BACEN (Selic e IPCA-E são buscados automaticamente via API do Banco Central).
2. **Seeds manuais:** Edite os arquivos em `backend/seeds/` (ex.: `selic_historico.sql`, `salario_minimo_historico.sql`) e execute `npm run seed`.

### Testes Automatizados

```bash
cd backend
npm test
```

Suite de testes Jest cobrindo: base rescisória, natureza jurídica de parcelas, periculosidade (OJ 82), multas arts. 467/477, INSS progressivo e reflexos em cascata (OJ 394).
