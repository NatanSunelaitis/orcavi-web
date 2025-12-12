import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { TransactionType } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Dashboard: React.FC = () => {
  const { accounts, transactions } = useFinance();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();

  // Navegação de mês
  const handlePreviousMonth = () => {
    setSelectedDate(subMonths(selectedDate, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // Cálculos do mês selecionado
  const monthlyTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [transactions, currentMonth, currentYear]);

  const income = useMemo(() => {
    return monthlyTransactions
      .filter(t => t.type === TransactionType.INCOME && t.isPaid)
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [monthlyTransactions]);

  const expense = useMemo(() => {
    return monthlyTransactions
      .filter(t => t.type === TransactionType.EXPENSE && t.isPaid)
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [monthlyTransactions]);

  const totalBalance = useMemo(() => {
    return accounts.reduce((acc, curr) => acc + curr.balance, 0);
  }, [accounts]);

  const balanceMonth = income - expense;
  const commitmentRate = income > 0 ? (expense / income) * 100 : 0;

  // Cálculo de comparação com mês anterior (para porcentagens)
  const previousMonth = useMemo(() => {
    const prevDate = subMonths(selectedDate, 1);
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === prevDate.getMonth() && d.getFullYear() === prevDate.getFullYear();
    });
  }, [transactions, selectedDate]);

  const previousIncome = useMemo(() => {
    return previousMonth
      .filter(t => t.type === TransactionType.INCOME && t.isPaid)
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [previousMonth]);

  const previousExpense = useMemo(() => {
    return previousMonth
      .filter(t => t.type === TransactionType.EXPENSE && t.isPaid)
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [previousMonth]);

  const incomeChange = previousIncome > 0 ? ((income - previousIncome) / previousIncome) * 100 : 0;
  const expenseChange = previousExpense > 0 ? ((expense - previousExpense) / previousExpense) * 100 : 0;

  // Dados do gráfico de pizza: Despesas por categoria
  const expensesByCategory = useMemo(() => {
    return monthlyTransactions
      .filter(t => t.type === TransactionType.EXPENSE && t.isPaid)
      .reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
      }, {} as Record<string, number>);
  }, [monthlyTransactions]);

  const pieData = Object.entries(expensesByCategory).map(([name, value]) => ({
    name,
    value: Math.round(value * 100) / 100
  }));

  const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#64748B', '#06B6D4'];

  // Dados do gráfico de barras: Últimos 6 meses (dados reais)
  const barData = useMemo(() => {
    const endDate = endOfMonth(selectedDate);
    const startDate = startOfMonth(subMonths(selectedDate, 5));
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    return months.map(month => {
      const monthTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === month.getMonth() &&
               d.getFullYear() === month.getFullYear() &&
               t.isPaid;
      });

      const monthIncome = monthTransactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((acc, curr) => acc + curr.amount, 0);

      const monthExpense = monthTransactions
        .filter(t => t.type === TransactionType.EXPENSE)
        .reduce((acc, curr) => acc + curr.amount, 0);

      return {
        name: format(month, 'MMM', { locale: ptBR }),
        income: Math.round(monthIncome * 100) / 100,
        expense: Math.round(monthExpense * 100) / 100,
      };
    });
  }, [transactions, selectedDate]);

  return (
    <div className="space-y-6">
      {/* Header com seletor de mês/ano */}
      <header className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Visão Geral</h1>
            <p className="text-slate-500 mt-1">
              {format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>

          {/* Controles de navegação */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>

            <button
              onClick={handleToday}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2"
            >
              <Calendar className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Hoje</span>
            </button>

            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Próximo mês"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Total */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-medium bg-white/20 backdrop-blur-sm px-2 py-1 rounded">Total</span>
          </div>
          <h3 className="text-blue-100 text-sm font-medium">Saldo Total</h3>
          <p className="text-2xl font-bold mt-1">
            R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Receitas */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            {incomeChange !== 0 && (
              <span className={`text-xs font-medium px-2 py-1 rounded ${
                incomeChange > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
              }`}>
                {incomeChange > 0 ? '+' : ''}{incomeChange.toFixed(1)}%
              </span>
            )}
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Receitas do Mês</h3>
          <p className="text-2xl font-bold text-green-600 mt-1">
            R$ {income.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Despesas */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-red-50 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            {expenseChange !== 0 && (
              <span className={`text-xs font-medium px-2 py-1 rounded ${
                expenseChange > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
              }`}>
                {expenseChange > 0 ? '+' : ''}{expenseChange.toFixed(1)}%
              </span>
            )}
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Despesas do Mês</h3>
          <p className="text-2xl font-bold text-red-600 mt-1">
            R$ {expense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Comprometimento */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded ${
              commitmentRate > 80 ? 'bg-red-50 text-red-600' :
              commitmentRate > 60 ? 'bg-yellow-50 text-yellow-600' :
              'bg-green-50 text-green-600'
            }`}>
              {commitmentRate > 80 ? 'Crítico' : commitmentRate > 60 ? 'Atenção' : 'Saudável'}
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Comprometimento</h3>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {commitmentRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de barras - Fluxo de caixa */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Fluxo de Caixa (Últimos 6 Meses)</h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span className="text-slate-600">Receitas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500"></div>
                <span className="text-slate-600">Despesas</span>
              </div>
            </div>
          </div>
          <div className="h-72 w-full">
            {barData.some(d => d.income > 0 || d.expense > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{fill: '#64748b', fontSize: 12}}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{fill: '#64748b', fontSize: 12}}
                    tickFormatter={(value) => `R$ ${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, '']}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Bar dataKey="income" fill="#10B981" radius={[8, 8, 0, 0]} name="Receitas" />
                  <Bar dataKey="expense" fill="#EF4444" radius={[8, 8, 0, 0]} name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Activity className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-sm">Nenhuma transação paga registrada</p>
                <p className="text-xs mt-1">Comece adicionando receitas e despesas</p>
              </div>
            )}
          </div>
        </div>

        {/* Gráfico de pizza - Gastos por categoria */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Gastos por Categoria</h3>
          <div className="h-72 w-full">
            {pieData.length > 0 ? (
              <>
                <div className="h-48 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        contentStyle={{
                          backgroundColor: '#fff',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Legenda customizada */}
                <div className="mt-4 space-y-2 max-h-24 overflow-y-auto">
                  {pieData.slice(0, 6).map((entry, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <span className="text-slate-600 truncate">{entry.name}</span>
                      </div>
                      <span className="font-semibold text-slate-900 ml-2">
                        R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                  {pieData.length > 6 && (
                    <p className="text-xs text-slate-400 text-center mt-2">
                      +{pieData.length - 6} categorias
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <DollarSign className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-sm">Sem despesas neste mês</p>
                <p className="text-xs mt-1">Suas despesas aparecerão aqui</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
