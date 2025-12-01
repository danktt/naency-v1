# Provisions – Backlog de Integração

## Limitações atuais

- **Insights e ações com IA**: painel ainda usa conteúdo estático (`PROVISION_INSIGHTS` e `PROVISION_ACTIONS`). Falta um endpoint para sugerir insights em tempo real a partir de tendências de provisões/transactions.
- **Agenda inteligente**: calendário exibe eventos mockados (`calendarEvents`). Ainda não há fonte de dados para checkpoints reais de provisões.
- **Fields ausentes no schema**: tabela `provisions` não persiste informações exibidas na UI (ex.: foco estratégico, milestones, status/autopilot). Consequentemente, alguns blocos usam heurísticas baseadas em cobertura.
- **Distribuição trimestral**: aba “Trimestres” reutiliza dados mockados (`QUARTER_CHART_DATA`). Precisa de endpoint que agregue provisões + despesas por trimestre.

## Próximos passos sugeridos

1. **Extender schema `provisions`** com colunas opcionais:
   - `focus` (string curta) para agrupar no gráfico.
   - `note` ou `milestone` para contextualizar cada provisão.
   - `autopilot_enabled` (boolean) para medir automação real.
2. **Endpoints adicionais (`provisionsRouter`)**:
   - `calendar` (lista de checkpoints/revisões com data e categoria).
   - `insights` (sugestões calculadas; inicialmente pode consumir heurísticas no backend).
   - `quarters` (agregação por trimestre com planned vs. committed).
3. **Integração com AI/Jobs**:
   - Preparar pipeline que analise `transactions` recorrentes e gere recomendações de provisão.
   - Armazenar feedback do usuário para treinar próximas sugestões.
4. **Testes**:
   - Cobrir `provisionsRouter` com testes unitários (validação de período, regras de conflito).
   - Adicionar e2e/Playwright para validar fluxo da tela (loading states, erros, troca de período).







