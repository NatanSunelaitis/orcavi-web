# Roteiro de Testes - Integração de Metas com Finanças

Este roteiro irá validar a integração completa entre metas, transações e contas no sistema FinanceControl.

---

## Pré-requisitos

1. Aplicação rodando em `http://localhost:3001`
2. Usuário logado no sistema
3. Limpar dados antigos (opcional, para testes mais limpos)

---

## Teste 1: Criar Conta e Meta Vinculada

**Objetivo:** Verificar se é possível criar uma meta vinculada a uma conta específica.

### Passos:

1. **Criar uma conta de teste:**
   - Ir em "Contas"
   - Clicar em "Nova Conta"
   - Nome: "Conta Teste Metas"
   - Tipo: "Poupança"
   - Saldo Inicial: R$ 5.000,00
   - Salvar

2. **Criar uma meta vinculada à conta:**
   - Ir em "Metas"
   - Clicar em "Nova Meta"
   - Nome: "Viagem para Paris"
   - Valor Total: R$ 10.000,00
   - Já tenho: R$ 0,00 (ou deixar em branco)
   - Data Limite: escolher uma data futura
   - Conta de Destino: Selecionar "Conta Teste Metas"
   - URL da Imagem (opcional): deixar em branco ou usar imagem de teste
   - Chave PIX (opcional): deixar em branco
   - Clicar em "Criar Meta"

### Resultado Esperado:
- Meta criada com sucesso
- Toast de confirmação aparece
- Meta aparece na lista com progresso em 0%
- Campo "Conta" mostra "Conta Teste Metas" no card da meta

---

## Teste 2: Contribuir para Meta através do Botão de Contribuição

**Objetivo:** Verificar se a contribuição cria uma transação e atualiza os saldos corretamente.

### Passos:

1. **Fazer contribuição:**
   - Na tela de "Metas", encontrar a meta "Viagem para Paris"
   - Clicar em "Adicionar Contribuição"
   - Conta de Origem: Selecionar "Conta Teste Metas"
   - Valor: R$ 1.500,00
   - Clicar em "Adicionar"

2. **Verificar atualização da meta:**
   - O progresso da meta deve atualizar para 15% (1.500 / 10.000)
   - "Guardado" deve mostrar R$ 1.500,00

3. **Verificar transação criada:**
   - Ir em "Transações"
   - Deve haver uma transação:
     - Descrição: "Contribuição para: Viagem para Paris"
     - Valor: R$ 1.500,00
     - Tipo: GOAL_CONTRIBUTION (ou aparece como "Contribuição para Meta")
     - Categoria: "Contribuição para Meta"
     - Conta: "Conta Teste Metas"
     - Status: Pago (ícone de check verde)

4. **Verificar saldo da conta:**
   - Ir em "Contas"
   - "Conta Teste Metas" deve mostrar:
     - Saldo Total: R$ 3.500,00 (5.000 - 1.500)
     - Disponível: R$ 2.000,00 (3.500 - 1.500)
     - Reservado em metas: R$ 1.500,00

### Resultado Esperado:
- Contribuição processada com sucesso
- Transação criada automaticamente
- Saldo da conta atualizado corretamente
- Saldo reservado aparece em "Contas"
- Toast de sucesso exibido

---

## Teste 3: Criar Transação de Receita Destinada a Meta

**Objetivo:** Verificar se é possível criar uma receita e destiná-la diretamente para uma meta.

### Passos:

1. **Criar transação de receita:**
   - Ir em "Transações"
   - Clicar em "Nova Transação"
   - Descrição: "Freelance - Cliente XYZ"
   - Valor: R$ 2.000,00
   - Data: hoje
   - Tipo: "RECEITA" (INCOME)
   - Categoria: "Freelance"
   - Conta: "Conta Teste Metas"
   - Marcar "Pago"
   - **Novo campo aparece:** "Destinar para Meta (Opcional)"
   - Selecionar: "Viagem para Paris (R$ 1.500,00 / R$ 10.000,00)"
   - Clicar em "Salvar"

2. **Verificar meta:**
   - Ir em "Metas"
   - "Viagem para Paris" deve mostrar:
     - Guardado: R$ 3.500,00 (1.500 + 2.000)
     - Progresso: 35%

3. **Verificar conta:**
   - Ir em "Contas"
   - "Conta Teste Metas" deve mostrar:
     - Saldo Total: R$ 5.500,00 (3.500 + 2.000)
     - Disponível: R$ 2.000,00 (5.500 - 3.500)
     - Reservado em metas: R$ 3.500,00

### Resultado Esperado:
- Receita criada e vinculada à meta
- Progresso da meta atualizado
- Saldos corretos tanto na conta quanto na meta
- Campo "Destinar para Meta" só aparece quando tipo é RECEITA

---

## Teste 4: Criar Meta SEM Vincular Conta

**Objetivo:** Verificar que metas podem ser criadas sem conta vinculada (funcionalidade opcional).

### Passos:

1. **Criar meta sem conta:**
   - Ir em "Metas"
   - Clicar em "Nova Meta"
   - Nome: "Notebook Novo"
   - Valor Total: R$ 3.500,00
   - Já tenho: R$ 500,00
   - Data Limite: escolher data futura
   - Conta de Destino: deixar "Nenhuma conta selecionada"
   - Clicar em "Criar Meta"

2. **Verificar meta criada:**
   - Meta deve aparecer com progresso de ~14% (500 / 3.500)
   - Card da meta NÃO deve mostrar campo "Conta"

3. **Fazer contribuição:**
   - Clicar em "Adicionar Contribuição"
   - Selecionar qualquer conta como origem
   - Valor: R$ 1.000,00
   - Clicar em "Adicionar"

4. **Verificar comportamento:**
   - Meta atualiza para R$ 1.500,00 (500 + 1.000)
   - Transação criada normalmente
   - **Importante:** Como não há conta vinculada à meta, o valor reservado NÃO aparecerá em "Contas" para esta meta específica

### Resultado Esperado:
- Metas podem ser criadas sem conta vinculada
- Contribuições funcionam normalmente
- Apenas metas COM conta vinculada aparecem no cálculo de "Reservado"

---

## Teste 5: Múltiplas Metas na Mesma Conta

**Objetivo:** Verificar se o cálculo de saldo reservado funciona com múltiplas metas.

### Passos:

1. **Criar segunda meta:**
   - Ir em "Metas"
   - Clicar em "Nova Meta"
   - Nome: "Carro Novo"
   - Valor Total: R$ 50.000,00
   - Já tenho: R$ 0,00
   - Conta de Destino: "Conta Teste Metas"
   - Clicar em "Criar Meta"

2. **Contribuir para segunda meta:**
   - Clicar em "Adicionar Contribuição" no card "Carro Novo"
   - Conta de Origem: "Conta Teste Metas"
   - Valor: R$ 3.000,00
   - Clicar em "Adicionar"

3. **Verificar conta:**
   - Ir em "Contas"
   - "Conta Teste Metas" deve mostrar:
     - Saldo Total: deve ter diminuído R$ 3.000,00
     - Reservado em metas: R$ 6.500,00 (3.500 da meta "Viagem" + 3.000 da meta "Carro")
     - Disponível: Saldo Total - 6.500

### Resultado Esperado:
- Múltiplas metas na mesma conta funcionam corretamente
- Saldo reservado é a soma de todas as metas vinculadas à conta
- Saldo disponível é calculado corretamente

---

## Teste 6: Editar Meta

**Objetivo:** Verificar se é possível editar informações da meta.

### Passos:

1. **Editar meta:**
   - Ir em "Metas"
   - Passar o mouse sobre o card "Viagem para Paris"
   - Clicar no botão de editar (ícone de lápis)
   - Alterar Nome para: "Viagem para Europa"
   - Alterar Valor Total para: R$ 15.000,00
   - **Observar:** Campo "Já tenho" deve estar desabilitado
   - Clicar em "Salvar Alterações"

2. **Verificar atualização:**
   - Nome atualizado no card
   - Progresso recalculado (agora 3.500 / 15.000 = 23,33%)

### Resultado Esperado:
- Edição funciona corretamente
- Campo "Já tenho" não é editável (usar "Adicionar Contribuição" para isso)
- Progresso recalculado automaticamente

---

## Teste 7: Excluir Meta

**Objetivo:** Verificar se a exclusão de meta funciona com diálogo de confirmação.

### Passos:

1. **Excluir meta:**
   - Ir em "Metas"
   - Passar o mouse sobre "Notebook Novo"
   - Clicar no botão de excluir (ícone de lixeira)
   - Diálogo customizado deve aparecer perguntando confirmação
   - Clicar em "Excluir"

2. **Verificar exclusão:**
   - Meta removida da lista
   - Toast de sucesso exibido

### Resultado Esperado:
- Diálogo de confirmação customizado (não o alert do navegador)
- Meta excluída com sucesso
- Toast de confirmação

---

## Teste 8: Verificar Filtro de Transações por Meta

**Objetivo:** Verificar se é possível identificar transações relacionadas a metas.

### Passos:

1. **Verificar transações:**
   - Ir em "Transações"
   - Procurar por transações do tipo "Contribuição para Meta" ou com descrição "Contribuição para: [Nome da Meta]"
   - Verificar se todas as contribuições feitas aparecem na lista

2. **Verificar detalhes:**
   - Cada transação de contribuição deve:
     - Ter categoria "Contribuição para Meta"
     - Estar marcada como paga
     - Mostrar a conta de origem correta
     - Ter o valor correto

### Resultado Esperado:
- Todas as contribuições aparecem em transações
- Fácil identificação de transações relacionadas a metas
- Informações consistentes

---

## Teste 9: Meta Atingida

**Objetivo:** Verificar comportamento quando meta é completada.

### Passos:

1. **Criar meta pequena:**
   - Nome: "Mesa de Escritório"
   - Valor Total: R$ 800,00
   - Já tenho: R$ 700,00
   - Conta: "Conta Teste Metas"

2. **Contribuir para completar:**
   - Adicionar contribuição de R$ 100,00
   - Meta deve atingir 100%

3. **Verificar visual:**
   - Botão "Adicionar Contribuição" deve ser substituído por "Conquistado!" com ícone de troféu
   - Badge ou indicador visual de meta completada

### Resultado Esperado:
- Meta completada mostra feedback visual diferente
- Não é mais possível adicionar contribuição (botão desabilitado ou oculto)
- Progresso em 100%

---

## Teste 10: Validação de Erros

**Objetivo:** Verificar se validações e mensagens de erro funcionam.

### Passos:

1. **Tentar criar meta sem preencher campos obrigatórios:**
   - Deixar "Nome" em branco → deve exigir preenchimento
   - Deixar "Valor Total" em branco → deve exigir preenchimento

2. **Tentar contribuir sem selecionar conta:**
   - Ao adicionar contribuição, não selecionar conta de origem
   - Deve exigir seleção

3. **Verificar limites de valor:**
   - Tentar contribuir com valor negativo ou zero
   - Deve bloquear

### Resultado Esperado:
- Validações HTML5 funcionando
- Mensagens de erro claras
- Não permite operações inválidas

---

## Resumo dos Pontos a Verificar

✅ Criação de metas com e sem conta vinculada
✅ Contribuições criam transações automaticamente
✅ Saldos das contas são atualizados corretamente
✅ "Reservado em metas" aparece nas contas
✅ "Disponível" é calculado como (Saldo Total - Reservado)
✅ Receitas podem ser destinadas diretamente a metas
✅ Campo "Destinar para Meta" só aparece em receitas
✅ Múltiplas metas na mesma conta funcionam
✅ Edição de metas funciona (exceto campo "Já tenho")
✅ Exclusão de metas com confirmação customizada
✅ Metas completadas mostram feedback visual
✅ Validações impedem operações inválidas
✅ Todas as transações aparecem na lista de transações
✅ Toasts de sucesso/erro aparecem corretamente

---

## Bugs Conhecidos a Verificar

Se durante os testes você encontrar algum dos problemas abaixo, anote:

- [ ] Saldo não atualiza após contribuição
- [ ] Transação não é criada ao contribuir
- [ ] Campo "Destinar para Meta" não aparece em receitas
- [ ] Saldo reservado não aparece ou está errado
- [ ] Progresso da meta não atualiza
- [ ] Diálogo de confirmação usa alert nativo do navegador
- [ ] Toast não aparece ou não desaparece
- [ ] Valores com mais de 2 casas decimais
- [ ] Múltiplas metas na mesma conta não somam corretamente

---

## Observações Finais

- **Dados em tempo real:** Todas as alterações devem refletir imediatamente nas outras telas
- **Persistência:** Ao recarregar a página (F5), todos os dados devem permanecer
- **Responsividade:** Testar em diferentes tamanhos de tela se possível
- **Console do navegador:** Verificar se não há erros no console (F12 → Console)

Boa sorte nos testes! 🚀
