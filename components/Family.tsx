import React from 'react';
import { UserPlus } from 'lucide-react';

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Member {
  name: string;
  avatar: string;
  color: string;
  income: number;
  expense: number;
  role: string;
  isPet?: boolean;
}

interface SharedTx {
  name: string;
  amount: number;
  cat: string;
  split: number[];
  date: string;
}

const members: Member[] = [
  { name: 'Natan', avatar: 'N', color: '#7C5CFC', income: 5200, expense: 1840, role: 'Administrador' },
  { name: 'Juliana', avatar: 'J', color: '#2E86AB', income: 4200, expense: 2100, role: 'Membro' },
  { name: 'Rex', avatar: '🐾', color: '#E8875A', income: 0, expense: 320, role: 'Pet', isPet: true },
];

const sharedTx: SharedTx[] = [
  { name: 'Aluguel', amount: 2000, cat: 'Moradia', split: [50, 50, 0], date: '01/04' },
  { name: 'Supermercado', amount: 680, cat: 'Alimentação', split: [40, 40, 20], date: '10/04' },
  { name: 'Internet + TV', amount: 180, cat: 'Serviços', split: [50, 50, 0], date: '05/04' },
  { name: 'Ração e Petshop', amount: 320, cat: 'Pet', split: [0, 0, 100], date: '08/04' },
];

const Family: React.FC = () => {
  const totalIncome = members.filter(m => !m.isPet).reduce((s, m) => s + m.income, 0);
  const totalExpense = members.reduce((s, m) => s + m.expense, 0);

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0D0D1A', letterSpacing: '-0.025em' }}>Finanças da Família</h1>
          <p className="text-sm mt-0.5" style={{ color: '#9090B0' }}>Controle compartilhado do grupo</p>
        </div>
        <button
          className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
          style={{ backgroundColor: '#2E86AB', boxShadow: '0 4px 12px rgba(46,134,171,0.3)' }}
        >
          <UserPlus className="w-4 h-4" /> Convidar Membro
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-6">
        <div className="rounded-xl p-5 text-white" style={{ background: 'linear-gradient(135deg,#2E86AB,#236B8A)', boxShadow: '0 4px 16px rgba(46,134,171,0.3)' }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>Renda Total</div>
          <div className="text-3xl font-extrabold" style={{ letterSpacing: '-0.025em' }}>{fmtBRL(totalIncome)}</div>
        </div>
        <div className="bg-white rounded-xl p-5" style={{ border: '1px solid #E8E4FF', boxShadow: '0 1px 3px rgba(124,92,252,0.06)' }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: '#9090B0' }}>Despesas Compartilhadas</div>
          <div className="text-3xl font-extrabold" style={{ color: '#DC4F3A', letterSpacing: '-0.025em' }}>{fmtBRL(totalExpense)}</div>
        </div>
        <div className="bg-white rounded-xl p-5" style={{ border: '1px solid #E8E4FF', boxShadow: '0 1px 3px rgba(124,92,252,0.06)' }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: '#9090B0' }}>Membros</div>
          <div className="flex items-center mt-1.5">
            {members.map((m, i) => (
              <div
                key={i}
                className="flex items-center justify-center font-bold text-white border-2 border-white"
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  backgroundColor: m.color,
                  fontSize: m.isPet ? 16 : 13,
                  marginLeft: i > 0 ? -8 : 0,
                  zIndex: members.length - i,
                  position: 'relative',
                }}
              >
                {m.avatar}
              </div>
            ))}
            <span className="text-sm font-bold ml-2.5" style={{ color: '#0D0D1A' }}>{members.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Members list */}
        <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #E8E4FF', boxShadow: '0 1px 3px rgba(124,92,252,0.06)' }}>
          <div className="px-5 py-3.5 text-sm font-bold" style={{ borderBottom: '1px solid #F5F3FF', color: '#0D0D1A' }}>
            Membros do Grupo
          </div>
          {members.map((m, i) => (
            <div
              key={i}
              className="flex justify-between items-center px-5 py-3.5"
              style={{ borderBottom: i < members.length - 1 ? '1px solid #F5F3FF' : 'none' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center font-bold text-white flex-shrink-0"
                  style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: m.color, fontSize: m.isPet ? 18 : 14 }}
                >
                  {m.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold" style={{ color: '#0D0D1A' }}>{m.name}</span>
                    {m.isPet && (
                      <span className="text-xs font-semibold px-1.5 py-px rounded-full" style={{ backgroundColor: '#FFE8D6', color: '#E8875A' }}>Pet</span>
                    )}
                  </div>
                  <div className="text-xs" style={{ color: '#9090B0' }}>{m.role}</div>
                </div>
              </div>
              <div className="text-right">
                {m.income > 0 && <div className="text-xs font-semibold" style={{ color: '#059669' }}>+{fmtBRL(m.income)}</div>}
                <div className="text-xs font-semibold" style={{ color: m.isPet ? '#E8875A' : '#DC4F3A' }}>−{fmtBRL(m.expense)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Shared expenses */}
        <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #E8E4FF', boxShadow: '0 1px 3px rgba(124,92,252,0.06)' }}>
          <div className="px-5 py-3.5 text-sm font-bold" style={{ borderBottom: '1px solid #F5F3FF', color: '#0D0D1A' }}>
            Despesas Divididas
          </div>
          {sharedTx.map((t, i) => (
            <div
              key={i}
              className="px-5 py-3"
              style={{ borderBottom: i < sharedTx.length - 1 ? '1px solid #F5F3FF' : 'none' }}
            >
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-medium" style={{ color: '#0D0D1A' }}>{t.name}</span>
                <span className="text-sm font-bold" style={{ color: t.cat === 'Pet' ? '#E8875A' : '#DC4F3A' }}>
                  −{fmtBRL(t.amount)}
                </span>
              </div>
              <div className="flex gap-1.5">
                {members.map((m, j) => t.split[j] > 0 && (
                  <span
                    key={j}
                    className="text-xs font-semibold px-2 py-px rounded-full"
                    style={{ backgroundColor: m.color + '22', color: m.color }}
                  >
                    {m.isPet ? '🐾' : m.avatar} {t.split[j]}%
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Family;
