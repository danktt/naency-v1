# 📘 Schema & Regras de Negócio do Sistema Financeiro

> Documento técnico explicativo do schema e regras de funcionamento do app de finanças (Modelo 2 – Cartão Independente)

---

## 🧱 1. Estrutura Geral do Sistema

O sistema é baseado em **grupos financeiros** (`financial_groups`), permitindo que múltiplos usuários compartilhem contas e lançamentos com controle de permissão.

Toda informação relevante é isolada por:

* `group_id`
* `user_id`

Isso garante multi-tenant seguro.

---

## 👤 2. Usuários e Compartilhamento

### users

Representa o usuário autenticado via Clerk.

Campos importantes:

* `clerk_id` → vínculo com auth externa
* `onboarding_completed` → controle de onboarding

### financial_groups

Espaço financeiro compartilhável.

Exemplo:

* "Finanças Danilo"
* "Família Danilo & Isa"

Regras:

* Cada grupo tem um `owner_id`.
* `presets_imported` controla se categorias default já foram clonadas.

### financial_group_members

Controla quem acessa o grupo:

* owner → controle total
* editor → pode editar
* viewer → apenas leitura

---

## 🏦 3. Contas Bancárias

Tabela: `bank_accounts`

Representa contas reais que possuem saldo.

Campos principais:

* name
* type: checking | investment | credit
* initial_balance
* currency
* color

### Regras de Negócio

1. Conta pertence sempre a um grupo.
2. Nome é único por grupo.
3. `initial_balance` é o ponto inicial do saldo.
4. O saldo atual é calculado pela soma dinâmica:

```
saldo_atual = initial_balance + incomes - expenses
```

---

## 🏷️ 4. Categorias

Tabela: `categories`

* Hierarquia via `parent_id`
* Soft delete via `is_active`
* Controlada por grupo

### category_presets

Categorias padrão globais que são clonadas na primeira criação de conta do grupo.

Regra:

* Importa apenas se `presets_imported = false`.

---

## 🔁 5. Transações Recorrentes

Tabela: `recurring_transactions`

São regras que geram transações futuras automaticamente.

Exemplo:

* Aluguel todo dia 5
* Salário todo dia 10

Campos importantes:

* recurrence_type
* start_date
* end_date
* is_active

Regras:

* São templates.
* Geram registros em `transactions` periodicamente.

---

## 💰 6. Transações (Núcleo do sistema)

Tabela: `transactions`

Tudo que afeta dinheiro passa aqui.

### Tipos:

* income
* expense
* transfer

### Métodos:

* debit
* credit
* pix
* transfer
* cash
* boleto

### Campos importantes:

* account_id
* credit_card_id
* amount
* description
* date
* is_paid
* paid_at

---

## 🧠 Regras Gerais de Transação

### ✅ Débito / Pix / Boleto

```text
method != credit
→ account_id obrigatório
→ credit_card_id deve ser null
```

### ✅ Crédito (cartão)

```text
method = credit
→ credit_card_id obrigatório
→ account_id deve ser null
```

### ✅ Transferência

```text
type = transfer
→ from_account_id obrigatório
→ to_account_id obrigatório
```

---

## 💳 7. Cartões de Crédito (Modelo 2)

Tabela: `credit_cards`

Representa cartões físicos ou virtuais.

Campos:

* name
* brand
* credit_limit
* available_limit
* closing_day
* due_day

### Regra Principal

O cartão NÃO possui saldo próprio.
Ele apenas gera dívidas que serão pagas futuramente.

---

## 📄 8. Faturas do Cartão

### credit_card_bills

Representa uma fatura mensal.

Campos:

* month
* year
* total_amount
* is_paid
* paid_with_account_id

### credit_card_bill_items

Itens que compõem a fatura (compras individuais).

Regras:

1. Cada compra no cartão gera:

   * transaction (expense + credit)
   * credit_card_bill_item
2. Ao pagar a fatura:

   * Cria nova transaction (expense + debit/pix)
   * Atualiza a fatura como paga

---

## 📌 Fluxo de Compra no Cartão

### 1. Criar compra

```
transaction
- type: expense
- method: credit
- credit_card_id: X
- account_id: null
```

### 2. Gerar item de fatura

```text
credit_card_bill_item
→ aponta para transaction
→ pertence a credit_card_bill do mês
```

### 3. Pagar fatura

```
transaction
- type: expense
- method: debit
- account_id: conta_pagadora
- credit_bill_id: fatura
```

---

## 📊 9. Dashboard & Saldos

### Cálculo principal

```
Saldo acumulado = initialBalance
+ incomes anteriores
- expenses anteriores
+ saldo do mês atual
```

### Exemplo prático

Saldo inicial: 5.000
Income mês: 20.000
Despesas: 0

Resultado:

```
Saldo acumulado = 25.000
```

---

## 📦 10. Provisões e Orçamentos

### provisions

Planejamento mensal por categoria.

### provision_templates

Modelos reutilizáveis de planejamento.

### provision_recurring_rules

Regras automáticas para repetir orçamento.

---

## ✅ Regras de Ouro (Resumo)

1. Toda informação pertence a um grupo
2. Saldo atual é calculado, não armazenado
3. Cartão de crédito é independente da conta
4. Compra no cartão NÃO altera saldo imediato
5. Fatura paga gera despesa real
6. Categorias nunca são apagadas definitivamente
7. Parcelamentos são agrupados por installment_group_id
8. Recorrentes são templates, não lançamentos

---

## 📎 Observações Finais

* Este schema é flexível para:

  * IA preditiva
  * Relatórios avançados
  * Multiusuário real
* Está preparado para:

  * Planejamento financeiro
  * Análise por categoria
  * Controle de fluxo de caixa

---

Se quiser, posso gerar também:

* 📄 Versão técnica para README do projeto
* 🔁 Fluxo visual da fatura (diagrama)
* 🧠 Documentação específica para IA financeira
