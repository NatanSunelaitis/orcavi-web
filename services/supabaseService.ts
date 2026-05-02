import { supabase } from '../lib/supabase';
import { Account, Transaction, Goal, TransactionType, RecurrenceFrequency } from '../types';
import { addMonths, addWeeks, addDays, addYears, isBefore, parseISO } from 'date-fns';

// ============ MAPPERS ============

function dbToAccount(row: any): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    balance: Number(row.balance),
    color: row.color,
  };
}

function dbToTransaction(row: any): Transaction {
  const t: Transaction = {
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    date: row.date ? row.date + 'T12:00:00.000Z' : new Date().toISOString(),
    type: row.type as TransactionType,
    category: row.category,
    accountId: row.account_id,
    isPaid: row.is_paid,
  };
  if (row.goal_id) t.goalId = row.goal_id;
  if (row.installment_total && row.installment_total > 1) {
    t.installments = {
      current: row.installment_current ?? 1,
      total: row.installment_total,
      parentTransactionId: row.parent_transaction_id ?? undefined,
    };
  }
  if (row.is_recurring) {
    t.recurrence = {
      isRecurring: true,
      frequency: row.recurring_interval as RecurrenceFrequency,
      parentTransactionId: row.parent_transaction_id ?? undefined,
    };
  }
  return t;
}

function dbToGoal(row: any): Goal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: Number(row.target_amount),
    currentAmount: Number(row.current_amount),
    deadline: row.target_date ?? '',
    imageUrl: row.image_url ?? undefined,
    accountId: row.account_id ?? undefined,
    pixKey: row.pix_key ?? undefined,
  };
}

function toDateOnly(isoString: string): string {
  return isoString.split('T')[0];
}

// ============ SERVICE ============

export const supabaseService = {

  // ============ ACCOUNTS ============
  async getAccounts(userId: string): Promise<Account[]> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) { console.error('Erro ao buscar contas:', error); return []; }
    return (data ?? []).map(dbToAccount);
  },

  async addAccount(userId: string, account: Omit<Account, 'id'>): Promise<Account> {
    const { data, error } = await supabase
      .from('accounts')
      .insert({ user_id: userId, name: account.name, type: account.type, balance: account.balance, color: account.color })
      .select()
      .single();
    if (error) throw error;
    return dbToAccount(data);
  },

  async updateAccount(userId: string, accountId: string, updates: Partial<Account>): Promise<void> {
    const { error } = await supabase
      .from('accounts')
      .update({
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.type !== undefined && { type: updates.type }),
        ...(updates.balance !== undefined && { balance: updates.balance }),
        ...(updates.color !== undefined && { color: updates.color }),
      })
      .eq('id', accountId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  async deleteAccount(userId: string, accountId: string): Promise<void> {
    const { error } = await supabase.from('accounts').delete().eq('id', accountId).eq('user_id', userId);
    if (error) throw error;
  },

  // ============ TRANSACTIONS ============
  async getTransactions(userId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    if (error) { console.error('Erro ao buscar transações:', error); return []; }
    return (data ?? []).map(dbToTransaction);
  },

  async addTransaction(userId: string, transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        account_id: transaction.accountId,
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        description: transaction.description,
        date: toDateOnly(transaction.date),
        is_paid: transaction.isPaid,
        goal_id: transaction.goalId ?? null,
        is_recurring: transaction.recurrence?.isRecurring ?? false,
        recurring_interval: transaction.recurrence?.frequency ?? null,
        installment_total: transaction.installments?.total ?? 1,
        installment_current: transaction.installments?.current ?? 1,
        parent_transaction_id: transaction.installments?.parentTransactionId
          ?? transaction.recurrence?.parentTransactionId
          ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    const newTransaction = dbToTransaction(data);

    if (transaction.isPaid && transaction.type !== TransactionType.GOAL_CONTRIBUTION) {
      const accounts = await this.getAccounts(userId);
      const account = accounts.find(a => a.id === transaction.accountId);
      if (account) {
        const newBalance = transaction.type === TransactionType.INCOME
          ? account.balance + transaction.amount
          : account.balance - transaction.amount;
        await this.updateAccount(userId, account.id, { balance: newBalance });
      }
    }

    if (transaction.recurrence?.isRecurring && transaction.recurrence.frequency) {
      await this.generateRecurringTransactions(userId, newTransaction);
    }

    if (transaction.installments && transaction.installments.total > 1) {
      await this.generateInstallments(userId, newTransaction);
    }

    if (transaction.goalId && transaction.type === TransactionType.GOAL_CONTRIBUTION && transaction.isPaid) {
      const { data: goalData } = await supabase.from('goals').select('current_amount').eq('id', transaction.goalId).single();
      if (goalData) {
        await this.updateGoal(userId, transaction.goalId, {
          currentAmount: Number(goalData.current_amount) + transaction.amount,
        });
      }
    }

    return newTransaction;
  },

  async updateTransaction(userId: string, transactionId: string, updates: Partial<Transaction>): Promise<void> {
    const { data: oldData } = await supabase.from('transactions').select('*').eq('id', transactionId).single();

    if (oldData && (updates.amount !== undefined || updates.type !== undefined || updates.accountId !== undefined)) {
      const accounts = await this.getAccounts(userId);
      const oldAccount = accounts.find(a => a.id === oldData.account_id);
      if (oldAccount && oldData.is_paid) {
        const reverted = oldData.type === TransactionType.INCOME
          ? oldAccount.balance - Number(oldData.amount)
          : oldAccount.balance + Number(oldData.amount);
        await this.updateAccount(userId, oldAccount.id, { balance: reverted });
      }
      const newAccountId = updates.accountId ?? oldData.account_id;
      const newAmount = updates.amount ?? Number(oldData.amount);
      const newType = updates.type ?? oldData.type;
      const newAccount = accounts.find(a => a.id === newAccountId);
      if (newAccount) {
        const newBalance = newType === TransactionType.INCOME
          ? newAccount.balance + newAmount
          : newAccount.balance - newAmount;
        await this.updateAccount(userId, newAccount.id, { balance: newBalance });
      }
    }

    const { error } = await supabase
      .from('transactions')
      .update({
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.amount !== undefined && { amount: updates.amount }),
        ...(updates.date !== undefined && { date: toDateOnly(updates.date) }),
        ...(updates.type !== undefined && { type: updates.type }),
        ...(updates.category !== undefined && { category: updates.category }),
        ...(updates.accountId !== undefined && { account_id: updates.accountId }),
        ...(updates.isPaid !== undefined && { is_paid: updates.isPaid }),
        ...(updates.goalId !== undefined && { goal_id: updates.goalId }),
      })
      .eq('id', transactionId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  async deleteTransaction(userId: string, transactionId: string): Promise<void> {
    const { data } = await supabase.from('transactions').select('*').eq('id', transactionId).single();

    if (data) {
      const accounts = await this.getAccounts(userId);
      const account = accounts.find(a => a.id === data.account_id);
      if (account && data.is_paid && data.type !== TransactionType.GOAL_CONTRIBUTION) {
        const reverted = data.type === TransactionType.INCOME
          ? account.balance - Number(data.amount)
          : account.balance + Number(data.amount);
        await this.updateAccount(userId, account.id, { balance: reverted });
      }
      if (data.goal_id && (data.type === TransactionType.INCOME || data.type === TransactionType.GOAL_CONTRIBUTION)) {
        const { data: goalData } = await supabase.from('goals').select('current_amount').eq('id', data.goal_id).single();
        if (goalData) {
          await this.updateGoal(userId, data.goal_id, {
            currentAmount: Math.max(0, Number(goalData.current_amount) - Number(data.amount)),
          });
        }
      }
    }

    const { error } = await supabase.from('transactions').delete().eq('id', transactionId).eq('user_id', userId);
    if (error) throw error;
  },

  async toggleTransactionPaid(userId: string, transactionId: string, isPaid: boolean): Promise<void> {
    const { error } = await supabase.from('transactions').update({ is_paid: isPaid }).eq('id', transactionId).eq('user_id', userId);
    if (error) throw error;
  },

  // ============ GOALS ============
  async getGoals(userId: string): Promise<Goal[]> {
    const { data, error } = await supabase.from('goals').select('*').eq('user_id', userId).order('created_at', { ascending: true });
    if (error) { console.error('Erro ao buscar metas:', error); return []; }
    return (data ?? []).map(dbToGoal);
  },

  async addGoal(userId: string, goal: Omit<Goal, 'id'>): Promise<Goal> {
    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        name: goal.name,
        target_amount: goal.targetAmount,
        current_amount: goal.currentAmount,
        target_date: goal.deadline || null,
        image_url: goal.imageUrl ?? null,
        account_id: goal.accountId ?? null,
        pix_key: goal.pixKey ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return dbToGoal(data);
  },

  async updateGoal(userId: string, goalId: string, updates: Partial<Goal>): Promise<void> {
    const { error } = await supabase
      .from('goals')
      .update({
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.targetAmount !== undefined && { target_amount: updates.targetAmount }),
        ...(updates.currentAmount !== undefined && { current_amount: updates.currentAmount }),
        ...(updates.deadline !== undefined && { target_date: updates.deadline || null }),
        ...(updates.imageUrl !== undefined && { image_url: updates.imageUrl }),
        ...(updates.accountId !== undefined && { account_id: updates.accountId }),
        ...(updates.pixKey !== undefined && { pix_key: updates.pixKey }),
      })
      .eq('id', goalId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  async deleteGoal(userId: string, goalId: string): Promise<void> {
    const { error } = await supabase.from('goals').delete().eq('id', goalId).eq('user_id', userId);
    if (error) throw error;
  },

  async contributeToGoal(userId: string, goalId: string, amount: number, accountId: string): Promise<void> {
    const { data: goalData } = await supabase.from('goals').select('*').eq('id', goalId).single();
    if (!goalData) return;
    await this.updateGoal(userId, goalId, { currentAmount: Number(goalData.current_amount) + amount });
    await this.addTransaction(userId, {
      description: `Contribuição para: ${goalData.name}`,
      amount,
      date: new Date().toISOString(),
      type: TransactionType.GOAL_CONTRIBUTION,
      category: 'Contribuição para Meta',
      accountId,
      isPaid: true,
      goalId,
    });
  },

  // ============ TRANSFER ============
  async transferBetweenAccounts(userId: string, fromAccountId: string, toAccountId: string, amount: number, description: string): Promise<void> {
    const accounts = await this.getAccounts(userId);
    const fromAccount = accounts.find(a => a.id === fromAccountId);
    const toAccount = accounts.find(a => a.id === toAccountId);
    if (!fromAccount || !toAccount) throw new Error('Conta não encontrada');
    if (fromAccount.balance < amount) throw new Error('Saldo insuficiente');

    await this.updateAccount(userId, fromAccountId, { balance: fromAccount.balance - amount });
    await this.updateAccount(userId, toAccountId, { balance: toAccount.balance + amount });

    const now = new Date().toISOString();
    await supabase.from('transactions').insert([
      { user_id: userId, account_id: fromAccountId, amount, type: TransactionType.EXPENSE, category: 'Transferência', description: `Transferência: ${description}`, date: toDateOnly(now), is_paid: true, installment_total: 1, installment_current: 1 },
      { user_id: userId, account_id: toAccountId, amount, type: TransactionType.INCOME, category: 'Transferência', description: `Transferência: ${description}`, date: toDateOnly(now), is_paid: true, installment_total: 1, installment_current: 1 },
    ]);
  },

  // ============ RECURRING ============
  async generateRecurringTransactions(userId: string, parent: Transaction): Promise<void> {
    if (!parent.recurrence?.isRecurring || !parent.recurrence.frequency) return;
    const { frequency, endDate } = parent.recurrence;
    const startDate = parseISO(parent.date);
    const finalDate = endDate ? parseISO(endDate) : addYears(startDate, 1);
    let currentDate = startDate;
    const rows: any[] = [];

    while (isBefore(currentDate, finalDate) && rows.length < 365) {
      switch (frequency) {
        case RecurrenceFrequency.DAILY:   currentDate = addDays(currentDate, 1);   break;
        case RecurrenceFrequency.WEEKLY:  currentDate = addWeeks(currentDate, 1);  break;
        case RecurrenceFrequency.MONTHLY: currentDate = addMonths(currentDate, 1); break;
        case RecurrenceFrequency.YEARLY:  currentDate = addYears(currentDate, 1);  break;
      }
      if (isBefore(currentDate, finalDate)) {
        rows.push({
          user_id: userId, account_id: parent.accountId,
          amount: parent.amount, type: parent.type, category: parent.category,
          description: parent.description, date: toDateOnly(currentDate.toISOString()),
          is_paid: false, is_recurring: false, parent_transaction_id: parent.id,
          installment_total: 1, installment_current: 1,
        });
      }
    }
    if (rows.length > 0) await supabase.from('transactions').insert(rows);
  },

  async generateInstallments(userId: string, parent: Transaction): Promise<void> {
    if (!parent.installments || parent.installments.total <= 1) return;
    const { total } = parent.installments;
    const regularAmount = Math.round((parent.amount / total) * 100) / 100;
    const firstAmount = Math.round((parent.amount - regularAmount * (total - 1)) * 100) / 100;
    const startDate = parseISO(parent.date);

    const rows: any[] = [];
    for (let i = 2; i <= total; i++) {
      rows.push({
        user_id: userId, account_id: parent.accountId,
        amount: regularAmount, type: parent.type, category: parent.category,
        description: parent.description, date: toDateOnly(addMonths(startDate, i - 1).toISOString()),
        is_paid: false, installment_total: total, installment_current: i,
        parent_transaction_id: parent.id,
      });
    }
    if (rows.length > 0) await supabase.from('transactions').insert(rows);

    await supabase.from('transactions').update({
      amount: firstAmount,
      installment_total: total,
      installment_current: 1,
      parent_transaction_id: parent.id,
    }).eq('id', parent.id);
  },
};
