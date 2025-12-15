import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { TransactionType, CATEGORIES, Transaction, RecurrenceFrequency } from '../types';
import { Plus, ArrowUpCircle, ArrowDownCircle, Filter, Edit2, Trash2, Check, X, Repeat, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import ConfirmDialog from './ConfirmDialog';
import ToastContainer from './ToastContainer';
import { useToast } from '../hooks/useToast';

const Transactions: React.FC = () => {
  const { transactions, accounts, goals, addTransaction, updateTransaction, deleteTransaction, toggleTransactionPaid, contributeToGoal } = useFinance();
  const { toasts, removeToast, showSuccess, showError, showWarning } = useToast();
  const [filterType, setFilterType] = useState<'ALL' | TransactionType>('ALL');
  const [filterPaid, setFilterPaid] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  // New Transaction State
  const [newTrans, setNewTrans] = useState({
    description: '',
    amount: '',
    type: TransactionType.EXPENSE,
    category: '',
    accountId: accounts[0]?.id || '',
    date: format(new Date(), 'yyyy-MM-dd'),
    isPaid: true,
    isRecurring: false,
    recurrenceFrequency: RecurrenceFrequency.MONTHLY,
    recurrenceEndDate: '',
    hasInstallments: false,
    installmentsTotal: 2,
    goalId: '',
    goalAmount: '' // Valor parcial a destinar para meta
  });

  const filteredTransactions = transactions
    .filter(t => filterType === 'ALL' || t.type === filterType)
    .filter(t => {
      if (filterPaid === 'ALL') return true;
      if (filterPaid === 'PAID') return t.isPaid;
      return !t.isPaid;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!newTrans.description || !newTrans.amount || !newTrans.category) {
      showWarning('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (!newTrans.accountId) {
      showWarning('Por favor, selecione uma conta. Você precisa criar uma conta primeiro na aba "Contas".');
      return;
    }

    try {
      // Criar objeto base da transação (sem campos undefined)
      // Para evitar problema de timezone, adiciona horário meio-dia UTC
      const [year, month, day] = newTrans.date.split('-');
      const dateAtNoon = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0));

      const transactionData: any = {
        description: newTrans.description,
        amount: Number(newTrans.amount),
        type: newTrans.type,
        category: newTrans.category,
        accountId: newTrans.accountId,
        date: dateAtNoon.toISOString(),
        isPaid: newTrans.isPaid
      };

      // Adicionar recurrence SOMENTE se for recorrente
      if (newTrans.isRecurring) {
        transactionData.recurrence = {
          isRecurring: true,
          frequency: newTrans.recurrenceFrequency
        };
        // Adicionar endDate somente se existir
        if (newTrans.recurrenceEndDate) {
          transactionData.recurrence.endDate = new Date(newTrans.recurrenceEndDate).toISOString();
        }
      }

      // Adicionar installments SOMENTE se tiver parcelas
      if (newTrans.hasInstallments) {
        transactionData.installments = {
          current: 1,
          total: newTrans.installmentsTotal
        };
      }

      // Lógica especial para receitas destinadas a metas
      if (newTrans.goalId && newTrans.type === TransactionType.INCOME) {
        const goalAmountValue = newTrans.goalAmount ? parseFloat(newTrans.goalAmount) : Number(newTrans.amount);

        // Validar que o valor destinado não é maior que a receita
        if (goalAmountValue > Number(newTrans.amount)) {
          showError('O valor destinado à meta não pode ser maior que o valor da receita.');
          return;
        }

        // Se for valor parcial, criar a receita normal primeiro
        if (newTrans.goalAmount && parseFloat(newTrans.goalAmount) < Number(newTrans.amount)) {
          await addTransaction(transactionData);

          // Depois criar uma contribuição separada para a meta
          await contributeToGoal(newTrans.goalId, goalAmountValue, newTrans.accountId);

          showSuccess(`Receita de R$ ${Number(newTrans.amount).toFixed(2)} criada! R$ ${goalAmountValue.toFixed(2)} destinado à meta.`);
        } else {
          // Se for valor total, adicionar goalId na transação
          transactionData.goalId = newTrans.goalId;
          await addTransaction(transactionData);
          showSuccess('Transação criada e valor destinado à meta!');
        }
      } else {
        // Transações normais (não destinadas a meta)
        if (editingTransaction) {
          await updateTransaction(editingTransaction.id, transactionData);
          setEditingTransaction(null);
          showSuccess('Transação atualizada com sucesso!');
        } else {
          await addTransaction(transactionData);
          showSuccess('Transação criada com sucesso!');
        }
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      showError('Erro ao salvar transação. Tente novamente.');
    }
  };

  const resetForm = () => {
    setNewTrans({
      description: '',
      amount: '',
      type: TransactionType.EXPENSE,
      category: '',
      accountId: accounts[0]?.id || '',
      date: format(new Date(), 'yyyy-MM-dd'),
      isPaid: true,
      isRecurring: false,
      recurrenceFrequency: RecurrenceFrequency.MONTHLY,
      recurrenceEndDate: '',
      hasInstallments: false,
      installmentsTotal: 2,
      goalId: '',
      goalAmount: ''
    });
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setNewTrans({
      description: transaction.description,
      amount: transaction.amount.toString(),
      type: transaction.type,
      category: transaction.category,
      accountId: transaction.accountId,
      date: format(new Date(transaction.date), 'yyyy-MM-dd'),
      isPaid: transaction.isPaid,
      isRecurring: transaction.recurrence?.isRecurring || false,
      recurrenceFrequency: transaction.recurrence?.frequency || RecurrenceFrequency.MONTHLY,
      recurrenceEndDate: transaction.recurrence?.endDate ? format(new Date(transaction.recurrence.endDate), 'yyyy-MM-dd') : '',
      hasInstallments: !!transaction.installments,
      installmentsTotal: transaction.installments?.total || 2,
      goalId: transaction.goalId || ''
    });
    setIsModalOpen(true);
  };

  const openDeleteConfirm = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!transactionToDelete) return;
    try {
      await deleteTransaction(transactionToDelete.id);
      setDeletingId(null);
      setTransactionToDelete(null);
      showSuccess('Transação excluída com sucesso!');
    } catch (error) {
      showError('Erro ao excluir transação. Tente novamente.');
    }
  };

  const handleTogglePaid = async (id: string, currentStatus: boolean) => {
    await toggleTransactionPaid(id, !currentStatus);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Transações</h1>
           <p className="text-slate-500">Histórico de receitas e despesas</p>
        </div>
        <button
          onClick={() => {
            if (accounts.length === 0) {
              alert('⚠️ Você precisa criar pelo menos uma conta antes de adicionar transações!\n\nVá para a aba "Contas" e crie sua primeira conta.');
              return;
            }
            setEditingTransaction(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Transação
        </button>
      </div>

      {/* Aviso se não houver contas */}
      {accounts.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-amber-900 mb-1">Nenhuma conta cadastrada</h3>
              <p className="text-amber-800 text-sm mb-3">Você precisa criar pelo menos uma conta antes de adicionar transações.</p>
              <a href="#/accounts" className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" />
                Criar Primeira Conta
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6">
        <div className="flex items-center gap-2 text-slate-500 mb-3">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filtrar por:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterType === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilterType(TransactionType.INCOME)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterType === TransactionType.INCOME ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
          >
            Receitas
          </button>
          <button
            onClick={() => setFilterType(TransactionType.EXPENSE)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterType === TransactionType.EXPENSE ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
          >
            Despesas
          </button>
          <div className="border-l border-slate-200 mx-2"></div>
          <button
            onClick={() => setFilterPaid('ALL')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterPaid === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilterPaid('PAID')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterPaid === 'PAID' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
          >
            Pagas
          </button>
          <button
            onClick={() => setFilterPaid('PENDING')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterPaid === 'PENDING' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
          >
            Pendentes
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Data</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Descrição</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Categoria</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Conta</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Valor</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((t) => {
                const account = accounts.find(a => a.id === t.accountId);
                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleTogglePaid(t.id, t.isPaid)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          t.isPaid ? 'bg-green-500 border-green-500' : 'border-slate-300 hover:border-green-500'
                        }`}
                      >
                        {t.isPaid && <Check className="w-4 h-4 text-white" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {t.type === TransactionType.INCOME ? (
                          <ArrowUpCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <ArrowDownCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        )}
                        <div>
                          <span className="font-medium text-slate-900">{t.description}</span>
                          <div className="flex items-center gap-2 mt-1">
                            {t.recurrence?.isRecurring && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                                <Repeat className="w-3 h-3" />
                                {t.recurrence.frequency}
                              </span>
                            )}
                            {t.installments && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                <CreditCard className="w-3 h-3" />
                                {t.installments.current}/{t.installments.total}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <span className="px-2 py-1 bg-slate-100 rounded-md text-xs">{t.category}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {account?.name || 'Desconhecida'}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${t.type === TransactionType.INCOME ? 'text-green-600' : 'text-slate-900'}`}>
                      {t.type === TransactionType.EXPENSE ? '- ' : '+ '}
                      R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(t)}
                          className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(t)}
                          className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Nenhuma transação encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingTransaction ? 'Editar Transação' : 'Nova Transação'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Type Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setNewTrans({...newTrans, type: TransactionType.EXPENSE, category: ''})}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${newTrans.type === TransactionType.EXPENSE ? 'bg-white shadow text-red-600' : 'text-slate-500'}`}
                >
                  Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setNewTrans({...newTrans, type: TransactionType.INCOME, category: ''})}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${newTrans.type === TransactionType.INCOME ? 'bg-white shadow text-green-600' : 'text-slate-500'}`}
                >
                  Receita
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newTrans.description}
                  onChange={e => setNewTrans({...newTrans, description: e.target.value})}
                  placeholder="Ex: Supermercado..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newTrans.amount}
                    onChange={e => setNewTrans({...newTrans, amount: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                  <input
                    type="date"
                    required
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newTrans.date}
                    onChange={e => setNewTrans({...newTrans, date: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                  <select
                    required
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newTrans.category}
                    onChange={e => setNewTrans({...newTrans, category: e.target.value})}
                  >
                    <option value="">Selecione</option>
                    {CATEGORIES[newTrans.type].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Conta</label>
                  <select
                    required
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newTrans.accountId}
                    onChange={e => setNewTrans({...newTrans, accountId: e.target.value})}
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Destinar para Meta (apenas para RECEITAS) */}
              {newTrans.type === TransactionType.INCOME && (
                <div className="space-y-3 border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <label className="block text-sm font-medium text-slate-700">Destinar para Meta (Opcional)</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                    value={newTrans.goalId}
                    onChange={e => setNewTrans({...newTrans, goalId: e.target.value, goalAmount: ''})}
                  >
                    <option value="">Nenhuma meta selecionada</option>
                    {goals.map(goal => (
                      <option key={goal.id} value={goal.id}>
                        {goal.name} (R$ {goal.currentAmount.toFixed(2)} / R$ {goal.targetAmount.toFixed(2)})
                      </option>
                    ))}
                  </select>

                  {newTrans.goalId && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Valor a Destinar (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={newTrans.amount}
                        placeholder={`Máximo: ${newTrans.amount || '0,00'}`}
                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 outline-none"
                        value={newTrans.goalAmount}
                        onChange={e => setNewTrans({...newTrans, goalAmount: e.target.value})}
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        {newTrans.goalAmount ?
                          `Destinando R$ ${parseFloat(newTrans.goalAmount).toFixed(2)} para a meta. Restante fica disponível na conta.` :
                          'Deixe em branco para destinar o valor total da receita.'
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Status Pago */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPaid"
                  checked={newTrans.isPaid}
                  onChange={e => setNewTrans({...newTrans, isPaid: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="isPaid" className="text-sm font-medium text-slate-700">
                  Marcar como pago
                </label>
              </div>

              {/* Recorrência */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={newTrans.isRecurring}
                    onChange={e => setNewTrans({...newTrans, isRecurring: e.target.checked, hasInstallments: false})}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="isRecurring" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Repeat className="w-4 h-4" />
                    Transação Recorrente
                  </label>
                </div>

                {newTrans.isRecurring && (
                  <div className="grid grid-cols-2 gap-4 ml-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Frequência</label>
                      <select
                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 outline-none"
                        value={newTrans.recurrenceFrequency}
                        onChange={e => setNewTrans({...newTrans, recurrenceFrequency: e.target.value as RecurrenceFrequency})}
                      >
                        {Object.values(RecurrenceFrequency).map(freq => (
                          <option key={freq} value={freq}>{freq}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Até (Opcional)</label>
                      <input
                        type="date"
                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 outline-none"
                        value={newTrans.recurrenceEndDate}
                        onChange={e => setNewTrans({...newTrans, recurrenceEndDate: e.target.value})}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Parcelas */}
              {!newTrans.isRecurring && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="hasInstallments"
                      checked={newTrans.hasInstallments}
                      onChange={e => setNewTrans({...newTrans, hasInstallments: e.target.checked})}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="hasInstallments" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Parcelar (Divide o valor em parcelas mensais)
                    </label>
                  </div>

                  {newTrans.hasInstallments && (
                    <div className="ml-6">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Número de Parcelas</label>
                      <select
                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={newTrans.installmentsTotal}
                        onChange={e => setNewTrans({...newTrans, installmentsTotal: Number(e.target.value)})}
                      >
                        {[2,3,4,5,6,10,12,18,24].map(i => (
                          <option key={i} value={i}>{i}x de R$ {(Number(newTrans.amount) / i).toFixed(2)}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingTransaction(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                >
                  {editingTransaction ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Excluir Transação"
        message={
          transactionToDelete?.goalId
            ? `Tem certeza que deseja excluir a transação "${transactionToDelete?.description}"?\n\n⚠️ ATENÇÃO: Esta transação está vinculada a uma meta. Ao excluí-la, o valor será revertido da meta automaticamente.\n\nEsta ação não pode ser desfeita.`
            : `Tem certeza que deseja excluir a transação "${transactionToDelete?.description}"? Esta ação não pode ser desfeita.`
        }
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default Transactions;
