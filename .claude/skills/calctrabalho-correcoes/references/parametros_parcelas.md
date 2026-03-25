# Parâmetros do Sistema de Parcelas

O aplicativo `calctrabalho` utiliza um sistema flexível para gerenciar parcelas personalizadas, permitindo a adaptação a inúmeras situações não previstas inicialmente. Este documento detalha os parâmetros obrigatórios e opcionais para o cadastro e edição de parcelas, garantindo que o sistema possa calcular corretamente qualquer verba trabalhista.

## Estrutura de Dados das Parcelas

Cada parcela cadastrada na biblioteca geral ou criada durante uma simulação deve conter um conjunto mínimo de parâmetros que definem sua identidade, forma de cálculo e repercussões no contrato de trabalho. A tabela a seguir detalha os campos da tabela `parcelas_personalizadas` no banco de dados.

| Parâmetro | Campo no BD | Descrição e Opções |
| :--- | :--- | :--- |
| **Nome** | `nome` | Nome claro e descritivo da parcela (ex: "Adicional de Periculosidade (30%)"). |
| **Base Normativa** | `descricao` | Indicação da fonte de lei, súmula, OJ ou norma coletiva que criou a parcela (ex: "Art. 193 CLT. Base: salário contratual × 30%."). |
| **Natureza** | `natureza` | Define se a parcela é `salarial` (integra a remuneração e gera reflexos) ou `indenizatoria` (visa ressarcir despesas, não gera reflexos). |
| **Tipo de Valor** | `tipo_valor` | Define como o valor é calculado: `fixo` (valor monetário informado), `percentual_salario` (sobre o salário base), `percentual_sm` (sobre o salário mínimo) ou `percentual_historico` (sobre histórico salarial). |
| **Valor Base** | `valor_base` | O valor monetário a ser pago, utilizado quando o tipo de valor é `fixo`. |
| **Percentual Base** | `percentual_base` | O percentual a ser aplicado sobre a base de cálculo, utilizado quando o tipo de valor é percentual. |
| **Gera Reflexos** | `gera_reflexos` | Booleano (`true`/`false`). Se verdadeiro, permite selecionar em quais parcelas haverá reflexo. |
| **Reflexos Em** | `reflexos_em` | Array de strings indicando as parcelas que receberão reflexos (ex: `dsr`, `ferias`, `decimo_terceiro`, `aviso_previo`, `fgts`). |
| **Incidências** | `incide_inss`, `incide_ir`, `incide_fgts` | Booleanos que definem se a parcela compõe a base de cálculo para recolhimento de INSS, Imposto de Renda e FGTS, respectivamente. |
| **Frequência** | `frequencia` | Define a periodicidade do pagamento: `unica`, `horaria`, `diaria_5d`, `diaria_6d`, `semanal`, `mensal`, `semestral`, `anual` ou `calculada`. |
| **Período de Vigência** | `periodo_tipo` | Define se a parcela é devida por todo o `contrato` ou em um período `especifico` (exigindo os campos `periodo_inicio` e `periodo_fim`). |

## Bibliotecas de Parcelas e Edição

O sistema opera com duas "bibliotecas" distintas de parcelas para garantir a integridade dos dados e a flexibilidade das simulações. A primeira é a **Biblioteca Geral**, identificada no banco de dados pelo campo `eh_biblioteca = true`. Esta biblioteca contém todas as parcelas pré-cadastradas e organizadas pelo sistema. Os parâmetros destas parcelas são salvos para verificação e edição pelo usuário, e elas ficam disponíveis para uso como templates em qualquer novo cálculo. Alterações realizadas diretamente na biblioteca geral afetam os templates padrão para todas as simulações futuras.

A segunda é a **Biblioteca da Simulação**, que representa as parcelas ativas em um cálculo em curso. Quando uma parcela da biblioteca geral é adicionada a um cálculo, ela é "instanciada" para aquela simulação específica. O usuário pode editar livremente os parâmetros dessa instância para adequá-la às particularidades do caso concreto. É fundamental ressaltar que as alterações feitas durante a elaboração do cálculo somente valerão para aquele cálculo em curso, não afetando a biblioteca geral. O campo `template_id` é utilizado para vincular a parcela instanciada à sua origem na biblioteca geral, permitindo rastreabilidade.

Algumas parcelas podem ter parâmetros próprios de acordo com suas características, como um divisor de jornada específico ou uma base de cálculo composta por múltiplas verbas. O sistema deve permitir a adaptação desses casos através da edição manual dos valores ou da criação de lógicas específicas no motor de cálculo (`engine.js`). Além disso, para fins de auditoria e transparência, todas as parcelas calculadas devem gerar uma `memoria.formula` clara, explicando detalhadamente como o valor final foi obtido, facilitando a conferência pelo usuário e pelo juízo.
