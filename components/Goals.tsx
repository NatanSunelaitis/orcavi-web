import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Target, Trophy, Plus, DollarSign, Edit2, Trash2, X, Calendar, Image as ImageIcon, Landmark, CreditCard } from 'lucide-react';
import { Goal, TransactionType } from '../types';
import ConfirmDialog from './ConfirmDialog';
import ToastContainer from './ToastContainer';
import { useToast } from '../hooks/useToast';

const Goals: React.FC = () => {
  const { goals, accounts, addGoal, updateGoal, deleteGoal, contributeToGoal, addTransaction } = useFinance();
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
    imageUrl: '',
    accountId: '',
    pixKey: ''
  });
  const [contributeAmount, setContributeAmount] = useState('');
  const [contributeAccountId, setContributeAccountId] = useState('');
  const [contributeType, setContributeType] = useState<'from_account' | 'direct_income'>('from_account');

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addGoal({
        name: formData.name,
        targetAmount: parseFloat(formData.targetAmount),
        currentAmount: parseFloat(formData.currentAmount || '0'),
        deadline: formData.deadline,
        imageUrl: formData.imageUrl || undefined,
        accountId: formData.accountId || undefined,
        pixKey: formData.pixKey || undefined
      });
      setFormData({ name: '', targetAmount: '', currentAmount: '', deadline: '', imageUrl: '', accountId: '', pixKey: '' });
      setShowAddModal(false);
      showSuccess('Meta criada com sucesso!');
    } catch (error) {
      showError('Erro ao criar meta. Tente novamente.');
    }
  };

  const handleEditGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    try {
      await updateGoal(selectedGoal.id, {
        name: formData.name,
        targetAmount: parseFloat(formData.targetAmount),
        deadline: formData.deadline,
        imageUrl: formData.imageUrl || undefined,
        accountId: formData.accountId || undefined,
        pixKey: formData.pixKey || undefined
      });
      setFormData({ name: '', targetAmount: '', currentAmount: '', deadline: '', imageUrl: '', accountId: '', pixKey: '' });
      setSelectedGoal(null);
      setShowEditModal(false);
      showSuccess('Meta atualizada com sucesso!');
    } catch (error) {
      showError('Erro ao atualizar meta. Tente novamente.');
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;

    const amount = parseFloat(contributeAmount);

    try {
      if (contributeType === 'direct_income') {
        // Receita direta para meta - cria transação de INCOME com goalId
        if (!contributeAccountId) {
          showError('Selecione a conta onde a receita será depositada.');
          return;
        }

        await addTransaction({
          description: `Receita para: ${selectedGoal.name}`,
          amount: amount,
          date: new Date().toISOString(),
          type: TransactionType.INCOME,
          category: 'Outros',
          accountId: contributeAccountId,
          isPaid: true,
          goalId: selectedGoal.id
        });

        showSuccess('Receita criada e destinada à meta!');
      } else {
        // Contribuição de conta existente
        if (!contributeAccountId) {
          showError('Selecione a conta de origem.');
          return;
        }

        await contributeToGoal(selectedGoal.id, amount, contributeAccountId);
        showSuccess('Contribuição adicionada com sucesso!');
      }

      setContributeAmount('');
      setContributeAccountId('');
      setContributeType('from_account');
      setSelectedGoal(null);
      setShowContributeModal(false);
    } catch (error) {
      showError('Erro ao adicionar contribuição. Tente novamente.');
    }
  };

  const openDeleteConfirm = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowDeleteConfirm(true);
  };

  const handleDeleteGoal = async () => {
    if (!selectedGoal) return;
    try {
      await deleteGoal(selectedGoal.id);
      setSelectedGoal(null);
      showSuccess('Meta excluída com sucesso!');
    } catch (error) {
      showError('Erro ao excluir meta. Tente novamente.');
    }
  };

  const openEditModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setFormData({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      deadline: goal.deadline,
      imageUrl: goal.imageUrl || '',
      accountId: goal.accountId || '',
      pixKey: goal.pixKey || ''
    });
    setShowEditModal(true);
  };

  const openContributeModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowContributeModal(true);
  };

  const getAccountName = (accountId?: string) => {
    if (!accountId) return null;
    const account = accounts.find(a => a.id === accountId);
    return account?.name;
  };

  return (
    <div className="min-h-full pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Meus Objetivos</h1>
          <p className="text-slate-500 mt-1">Transforme seus sonhos em realidade financeira</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          Nova Meta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map(goal => {
          const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
          const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
          const hasImage = !!goal.imageUrl;
          const accountName = getAccountName(goal.accountId);

          return (
            <div key={goal.id} className="group relative bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-[450px]">
              {/* Image Area */}
              <div className="h-48 relative overflow-hidden bg-slate-100">
                {hasImage ? (
                  <>
                    <img
                      src={goal.imageUrl}
                      alt={goal.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-300">
                      <Trophy className="w-12 h-12" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                    <Trophy className="w-16 h-16 text-white/30" />
                  </div>
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>

                {/* Top Actions */}
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(goal)}
                    className="bg-white/20 backdrop-blur-md p-2 rounded-lg text-white hover:bg-blue-500 transition-colors"
                    title="Editar Meta"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openDeleteConfirm(goal)}
                    className="bg-white/20 backdrop-blur-md p-2 rounded-lg text-white hover:bg-red-500 transition-colors"
                    title="Excluir Meta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Header Info on Image */}
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="flex items-center gap-2 text-xs font-medium text-white/80 mb-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                  </div>
                  <h3 className="text-xl font-bold leading-tight">{goal.name}</h3>
                </div>
              </div>

              {/* Content Area */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-medium text-slate-500">Progresso</span>
                    <span className="text-sm font-bold text-slate-900">{progress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 mb-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between text-sm mb-4">
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wider">Guardado</p>
                      <p className="font-bold text-slate-900 text-lg">R$ {goal.currentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-xs uppercase tracking-wider">Objetivo</p>
                      <p className="font-semibold text-slate-600">R$ {goal.targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  {/* Account and PIX Info */}
                  {(accountName || goal.pixKey) && (
                    <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg">
                      {accountName && (
                        <div className="flex items-center gap-2">
                          <Landmark className="w-3 h-3 text-slate-400" />
                          <span><strong>Conta:</strong> {accountName}</span>
                        </div>
                      )}
                      {goal.pixKey && (
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-3 h-3 text-slate-400" />
                          <span className="truncate"><strong>PIX:</strong> {goal.pixKey}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-50">
                  {remaining <= 0 ? (
                    <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-3 py-2 rounded-lg w-full justify-center">
                      <Trophy className="w-5 h-5" />
                      Conquistado!
                    </div>
                  ) : (
                    <button
                      onClick={() => openContributeModal(goal)}
                      className="w-full py-2.5 rounded-lg border-2 border-purple-600 text-purple-600 font-semibold hover:bg-purple-600 hover:text-white transition-all flex items-center justify-center gap-2 group/btn"
                    >
                      <DollarSign className="w-4 h-4" />
                      Adicionar Contribuição
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Create New Card */}
        <button
          onClick={() => setShowAddModal(true)}
          className="group relative h-[450px] border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-purple-500 hover:text-purple-500 hover:bg-purple-50/30 transition-all cursor-pointer"
        >
          <div className="bg-slate-100 p-4 rounded-full mb-4 group-hover:bg-purple-100 transition-colors">
            <Target className="w-8 h-8" />
          </div>
          <span className="font-medium text-lg">Criar Nova Meta</span>
          <span className="text-sm opacity-70 mt-1">Defina um novo sonho</span>
        </button>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-900">{showEditModal ? 'Editar Meta' : 'Nova Meta'}</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setFormData({ name: '', targetAmount: '', currentAmount: '', deadline: '', imageUrl: '', accountId: '', pixKey: '' });
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={showEditModal ? handleEditGoal : handleAddGoal} className="p-6 space-y-4">
              {/* Image Preview */}
              <div className="relative h-40 bg-slate-100 rounded-xl overflow-hidden mb-4 border border-slate-200 group">
                {formData.imageUrl ? (
                  <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <ImageIcon className="w-8 h-8 mb-2" />
                    <span className="text-xs">Preview da imagem</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-medium">Insira a URL abaixo</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Objetivo</label>
                <input
                  type="text"
                  required
                  className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 outline-none transition-shadow"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Viagem para Paris"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor Total (R$)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 outline-none transition-shadow"
                    value={formData.targetAmount}
                    onChange={e => setFormData({ ...formData, targetAmount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Já tenho (Opcional)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 outline-none transition-shadow"
                    value={formData.currentAmount}
                    onChange={e => setFormData({ ...formData, currentAmount: e.target.value })}
                    disabled={showEditModal}
                    title={showEditModal ? 'Não é possível editar o valor atual. Use "Adicionar Contribuição"' : ''}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data Limite</label>
                <input
                  type="date"
                  required
                  className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 outline-none transition-shadow"
                  value={formData.deadline}
                  onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">URL da Imagem (Opcional)</label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded-lg p-3 pl-9 focus:ring-2 focus:ring-purple-500 outline-none transition-shadow text-sm"
                    value={formData.imageUrl}
                    onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Use imagens do Unsplash ou similares.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Conta de Destino <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Landmark className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <select
                    required
                    className="w-full border border-slate-300 rounded-lg p-3 pl-9 focus:ring-2 focus:ring-purple-500 outline-none transition-shadow appearance-none bg-white"
                    value={formData.accountId}
                    onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                  >
                    <option value="">Selecione uma conta</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} - {account.type}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-slate-400 mt-1">Onde o dinheiro ficará guardado.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Chave PIX (Opcional)</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded-lg p-3 pl-9 focus:ring-2 focus:ring-purple-500 outline-none transition-shadow"
                    value={formData.pixKey}
                    onChange={e => setFormData({ ...formData, pixKey: e.target.value })}
                    placeholder="email@exemplo.com, CPF, telefone..."
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Para facilitar recebimento de contribuições.</p>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-purple-600 text-white font-bold py-3.5 rounded-xl hover:bg-purple-700 transition-colors shadow-lg flex items-center justify-center gap-2"
                >
                  {showEditModal ? (
                    <>
                      <Edit2 className="w-5 h-5" />
                      Salvar Alterações
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Criar Meta
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribute Modal */}
      {showContributeModal && selectedGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">Adicionar Contribuição</h2>
              <button onClick={() => setShowContributeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="mb-4 p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Meta: <strong>{selectedGoal.name}</strong></p>
              <p className="text-sm text-slate-600">
                Progresso atual: <strong>R$ {selectedGoal.currentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> de <strong>R$ {selectedGoal.targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </p>
            </div>
            <form onSubmit={handleContribute} className="space-y-4">
              {/* Tipo de Contribuição */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Contribuição</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="contributeType"
                      value="from_account"
                      checked={contributeType === 'from_account'}
                      onChange={() => setContributeType('from_account')}
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="text-sm">Transferir de uma conta existente</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="contributeType"
                      value="direct_income"
                      checked={contributeType === 'direct_income'}
                      onChange={() => setContributeType('direct_income')}
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="text-sm">Receita direta para a meta</span>
                  </label>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {contributeType === 'from_account' ?
                    'O valor será retirado de uma conta existente.' :
                    'Uma receita será criada e depositada direto na meta.'
                  }
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {contributeType === 'from_account' ? 'Conta de Origem' : 'Conta de Destino'}
                </label>
                <div className="relative">
                  <Landmark className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <select
                    required
                    className="w-full border border-slate-300 rounded-lg p-2.5 pl-9 focus:ring-2 focus:ring-purple-500 outline-none transition-shadow appearance-none bg-white"
                    value={contributeAccountId}
                    onChange={e => setContributeAccountId(e.target.value)}
                  >
                    <option value="">Selecione a conta</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} - R$ {account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {contributeType === 'from_account' ?
                    'De onde sairá o valor da contribuição.' :
                    'Onde a receita será depositada.'
                  }
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Valor {contributeType === 'direct_income' ? 'da Receita' : 'da Contribuição'} (R$)
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  value={contributeAmount}
                  onChange={(e) => setContributeAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowContributeModal(false);
                    setContributeAmount('');
                    setContributeAccountId('');
                    setContributeType('from_account');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                >
                  <DollarSign className="w-5 h-5" />
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteGoal}
        title="Excluir Meta"
        message={`Tem certeza que deseja excluir a meta "${selectedGoal?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default Goals;
