# Changelog - Correções e Melhorias

## Data: 15/12/2024

### 🐛 Bugs Corrigidos

#### 1. **Bug de Timezone - Data aparecendo com 1 dia a menos**
**Arquivo:** `components/Transactions.tsx`
- **Problema:** Ao criar transação com data "14/12", aparecia como "13/12"
- **Causa:** Conversão de timezone ao transformar string de data em ISO
- **Solução:** Criação de data com horário meio-dia UTC para evitar mudança de dia
```typescript
const [year, month, day] = newTrans.date.split('-');
const dateAtNoon = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0));
```

#### 2. **Contribuição não atualizava a meta**
**Arquivo:** `services/firestore.ts`
- **Problema:** Ao criar receita destinada a meta (goalId), a meta não era atualizada
- **Solução:** Adicionada lógica em `addTransaction` para detectar `goalId` e atualizar a meta automaticamente
```typescript
if (transaction.goalId && transaction.type === TransactionType.INCOME && transaction.isPaid) {
  const goalDoc = await getDoc(doc(db, 'users', userId, 'goals', transaction.goalId));
  const goal = goalDoc.data();
  if (goal) {
    await this.updateGoal(userId, transaction.goalId, {
      currentAmount: goal.currentAmount + transaction.amount
    });
  }
}
```

#### 3. **Valores ficando quebrados (9.999,99 ao invés de 10.000,00)**
**Arquivo:** `services/firestore.ts` - função `generateInstallments`
- **Problema:** Arredondamento de parcelas causava perda de centavos (ex: 10.000 ÷ 3 = 3.333,33 × 3 = 9.999,99)
- **Solução:** Primeira parcela compensa diferença de arredondamento
```typescript
const regularInstallmentAmount = Math.round((totalAmount / total) * 100) / 100;
const regularInstallmentsSum = regularInstallmentAmount * (total - 1);
const firstInstallmentAmount = Math.round((totalAmount - regularInstallmentsSum) * 100) / 100;
```
Agora: 10.000 ÷ 3 = 1ª: 3.333,34 | 2ª: 3.333,33 | 3ª: 3.333,33 = 10.000,00 ✓

#### 4. **Campos opcionais bloqueavam criação de metas**
**Arquivo:** `components/Goals.tsx`
- **Problema:** Campo "URL da Imagem" com `type="url"` exigia formato válido mesmo vazio
- **Solução:** Alterado para `type="text"` permitindo campo vazio

#### 5. **Conta de destino deveria ser obrigatória**
**Arquivo:** `components/Goals.tsx`
- **Problema:** Meta podia ser criada sem conta vinculada
- **Solução:** Adicionado `required` no select e asterisco vermelho no label
```html
<label>Conta de Destino <span className="text-red-500">*</span></label>
<select required>...</select>
```

#### 6. **Exclusão de transação vinculada não revertia meta**
**Arquivo:** `services/firestore.ts` - função `deleteTransaction`
- **Problema:** Ao excluir transação com `goalId`, a meta não era revertida
- **Solução:** Detecta `goalId` e reverte o valor da meta
```typescript
if (transaction.goalId && (transaction.type === TransactionType.INCOME || transaction.type === TransactionType.GOAL_CONTRIBUTION)) {
  const goalDoc = await getDoc(doc(db, 'users', userId, 'goals', transaction.goalId));
  const goal = goalDoc.data();
  if (goal) {
    const newCurrentAmount = Math.max(0, goal.currentAmount - transaction.amount);
    await this.updateGoal(userId, transaction.goalId, { currentAmount: newCurrentAmount });
  }
}
```

#### 7. **Falta de aviso ao excluir transação vinculada**
**Arquivo:** `components/Transactions.tsx`
- **Problema:** Usuário não era avisado que excluir transação afetaria a meta
- **Solução:** Mensagem de confirmação especial para transações com `goalId`
```typescript
message={
  transactionToDelete?.goalId
    ? `⚠️ ATENÇÃO: Esta transação está vinculada a uma meta. Ao excluí-la, o valor será revertido da meta automaticamente.\n\nEsta ação não pode ser desfeita.`
    : `Tem certeza que deseja excluir a transação? Esta ação não pode ser desfeita.`
}
```

#### 8. **Saldo reservado calculado incorretamente**
**Arquivo:** `components/Accounts.tsx`
- **Problema:** Saldo reservado era baseado em `currentAmount` da meta, causando valores negativos quando meta tinha receitas diretas
- **Solução:** Agora calcula baseado em transações `GOAL_CONTRIBUTION` que saíram da conta
```typescript
const getReservedAmount = (accountId: string) => {
  return transactions
    .filter(t =>
      t.accountId === accountId &&
      t.type === TransactionType.GOAL_CONTRIBUTION &&
      t.isPaid
    )
    .reduce((sum, t) => sum + t.amount, 0);
};
```

---

### ✨ Novas Funcionalidades

#### 1. **Valor parcial para destinar a meta**
**Arquivo:** `components/Transactions.tsx`
- **Funcionalidade:** Ao criar receita, permite destinar apenas parte do valor para meta
- **Como funciona:**
  - Campo opcional "Valor a Destinar" aparece quando meta é selecionada
  - Se preenchido: cria receita normal + contribuição separada
  - Se vazio: destina valor total da receita
```typescript
{newTrans.goalId && (
  <div>
    <label>Valor a Destinar (R$)</label>
    <input type="number" max={newTrans.amount} value={newTrans.goalAmount} />
    <p>Destinando R$ {goalAmount} para a meta. Restante fica disponível.</p>
  </div>
)}
```

#### 2. **Receita direta para meta**
**Arquivo:** `components/Goals.tsx`
- **Funcionalidade:** Ao contribuir para meta, permite escolher entre:
  - **Transferir de conta existente** (comportamento antigo - GOAL_CONTRIBUTION)
  - **Receita direta para meta** (novo - cria INCOME com goalId)
- **Interface:** Radio buttons no modal de contribuição
```typescript
<div>
  <input type="radio" value="from_account" />
  <span>Transferir de uma conta existente</span>
</div>
<div>
  <input type="radio" value="direct_income" />
  <span>Receita direta para a meta</span>
</div>
```

---

### 📊 Arquivos Modificados

1. **components/Transactions.tsx**
   - Correção de timezone
   - Adição de valor parcial para meta
   - Mensagem de confirmação para exclusão de transação vinculada

2. **components/Goals.tsx**
   - Campo URL como text (não URL)
   - Conta obrigatória
   - Opção de receita direta para meta

3. **components/Accounts.tsx**
   - Cálculo correto de saldo reservado

4. **services/firestore.ts**
   - Atualização automática de meta ao criar transação com goalId
   - Correção de arredondamento de parcelas
   - Reversão de meta ao excluir transação

---

### 🎯 Resultado Final

**Sistema de metas totalmente integrado com finanças:**
- ✅ Contribuições criam transações automaticamente
- ✅ Receitas podem ser destinadas (total ou parcial) para metas
- ✅ Saldos das contas refletem valores reservados vs disponíveis
- ✅ Exclusão de transações reverte metas corretamente
- ✅ Valores sempre corretos (sem perda de centavos)
- ✅ Datas exibidas corretamente (sem bug de timezone)
- ✅ Validações claras e mensagens informativas
