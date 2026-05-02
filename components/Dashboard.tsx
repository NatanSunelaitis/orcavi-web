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

  const COLORS = ['#7C5CFC', '#059669', '#F59E0B', '#DC4F3A', '#2E86AB', '#A78BFA', '#6B6B9A', '#E8875A'];

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
      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#0D0D1A', letterSpacing: '-0.025em' }}>Visão Geral</h1>
            <p className="mt-1" style={{ color: '#9090B0', fontSize: 14 }}>
              {format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>

          {/* Controles de navegação */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousMonth}
              className="p-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'white', border: '1px solid #E8E4FF' }}
              title="Mês anterior"
            >
              <ChevronLeft className="w-5 h-5" style={{ color: '#4B4B6B' }} />
            </button>

            <button
              onClick={handleToday}
              className="px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              style={{ backgroundColor: 'white', border: '1px solid #E8E4FF' }}
            >
              <Calendar className="w-4 h-4" style={{ color: '#7C5CFC' }} />
              <span className="text-sm font-medium" style={{ color: '#4B4B6B' }}>Hoje</span>
            </button>

            <button
              onClick={handleNextMonth}
              className="p-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'white', border: '1px solid #E8E4FF' }}
              title="Próximo mês"
            >
              <ChevronRight className="w-5 h-5" style={{ color: '#4B4B6B' }} />
            </button>
          </div>
        </div>
      </header>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Total - Hero */}
        <div
          className="p-6 rounded-xl text-white"
          style={{ background: 'linear-gradient(135deg, #7C5CFC, #6D28D9)', boxShadow: '0 4px 20px rgba(124,92,252,0.35)' }}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}>
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>Total</span>
          </div>
          <h3 className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>Saldo Total</h3>
          <p className="text-2xl font-extrabold mt-1" style={{ letterSpacing: '-0.025em' }}>
            R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Receitas */}
        <div className="bg-white p-6 rounded-xl hover:shadow-md transition-shadow" style={{ border: '1px solid #E8E4FF', boxShadow: '0 1px 3px rgba(124,92,252,0.06)' }}>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#ECFDF5' }}>
              <TrendingUp className="w-6 h-6" style={{ color: '#059669' }} />
            </div>
            {incomeChange !== 0 && (
              <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{
                backgroundColor: incomeChange > 0 ? '#D1FAE5' : '#FFE4DF',
                color: incomeChange > 0 ? '#059669' : '#DC4F3A'
              }}>
                {incomeChange > 0 ? '+' : ''}{incomeChange.toFixed(1)}%
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium" style={{ color: '#9090B0' }}>Receitas do Mês</h3>
          <p className="text-2xl font-extrabold mt-1" style={{ color: '#059669', letterSpacing: '-0.025em' }}>
            R$ {income.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Despesas */}
        <div className="bg-white p-6 rounded-xl hover:shadow-md transition-shadow" style={{ border: '1px solid #E8E4FF', boxShadow: '0 1px 3px rgba(124,92,252,0.06)' }}>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#FFF5F3' }}>
              <TrendingDown className="w-6 h-6" style={{ color: '#DC4F3A' }} />
            </div>
            {expenseChange !== 0 && (
              <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{
                backgroundColor: expenseChange > 0 ? '#FFE4DF' : '#D1FAE5',
                color: expenseChange > 0 ? '#DC4F3A' : '#059669'
              }}>
                {expenseChange > 0 ? '+' : ''}{expenseChange.toFixed(1)}%
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium" style={{ color: '#9090B0' }}>Despesas do Mês</h3>
          <p className="text-2xl font-extrabold mt-1" style={{ color: '#DC4F3A', letterSpacing: '-0.025em' }}>
            R$ {expense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Comprometimento */}
        <div className="bg-white p-6 rounded-xl hover:shadow-md transition-shadow" style={{ border: '1px solid #E8E4FF', boxShadow: '0 1px 3px rgba(124,92,252,0.06)' }}>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#EDE9FE' }}>
              <Activity className="w-6 h-6" style={{ color: '#7C5CFC' }} />
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{
              backgroundColor: commitmentRate > 80 ? '#FFE4DF' : commitmentRate > 60 ? '#FEF3C7' : '#D1FAE5',
              color: commitmentRate > 80 ? '#DC4F3A' : commitmentRate > 60 ? '#F59E0B' : '#059669'
            }}>
              {commitmentRate > 80 ? 'Crítico' : commitmentRate > 60 ? 'Atenção' : 'Saudável'}
            </span>
          </div>
          <h3 className="text-sm font-medium" style={{ color: '#9090B0' }}>Comprometimento</h3>
          <p className="text-2xl font-extrabold mt-1" style={{ color: '#0D0D1A', letterSpacing: '-0.025em' }}>
            {commitmentRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de barras - Fluxo de caixa */}
        <div className="bg-white p-6 rounded-xl lg:col-span-2 hover:shadow-md transition-shadow" style={{ border: '1px solid #E8E4FF', boxShadow: '0 1px 3px rgba(124,92,252,0.06)' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold" style={{ color: '#0D0D1A' }}>Fluxo de Caixa — 6 meses</h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: '#059669' }}></div>
                <span style={{ color: '#9090B0' }}>Receitas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: '#DC4F3A' }}></div>
                <span style={{ color: '#9090B0' }}>Despesas</span>
              </div>
            </div>
          </div>
          <div className="h-72 w-full">
            {barData.some(d => d.income > 0 || d.expense > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9090B0', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9090B0', fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #E8E4FF', boxShadow: '0 4px 12px rgba(124,92,252,0.1)', fontSize: 12 }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, '']}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Bar dataKey="income" fill="#059669" radius={[4, 4, 0, 0]} name="Receitas" />
                  <Bar dataKey="expense" fill="#DC4F3A" radius={[4, 4, 0, 0]} name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full" style={{ color: '#9090B0' }}>
                <Activity className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-sm">Nenhuma transação paga registrada</p>
                <p className="text-xs mt-1">Comece adicionando receitas e despesas</p>
              </div>
            )}
          </div>
        </div>

        {/* Gastos por categoria */}
        <div className="bg-white p-6 rounded-xl hover:shadow-md transition-shadow" style={{ border: '1px solid #E8E4FF', boxShadow: '0 1px 3px rgba(124,92,252,0.06)' }}>
          <h3 className="text-base font-bold mb-6" style={{ color: '#0D0D1A' }}>Gastos por Categoria</h3>
          <div className="h-72 w-full">
            {pieData.length > 0 ? (
              <>
                <div className="h-48 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        contentStyle={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #E8E4FF', fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2 max-h-24 overflow-y-auto">
                  {pieData.slice(0, 6).map((entry, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span style={{ color: '#4B4B6B' }} className="truncate">{entry.name}</span>
                      </div>
                      <span className="font-semibold ml-2" style={{ color: '#0D0D1A' }}>
                        R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                  {pieData.length > 6 && (
                    <p className="text-xs text-center mt-2" style={{ color: '#9090B0' }}>+{pieData.length - 6} categorias</p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full" style={{ color: '#9090B0' }}>
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
