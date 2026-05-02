import React from 'react';
import { Plus, Lightbulb } from 'lucide-react';

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Debt {
  id: number;
  name: string;
  creditor: string;
  total: number;
  paid: number;
  installment: number;
  remaining: number;
  dueDay: number;
  rate: number;
}

const mockDebts: Debt[] = [
  { id: 1, name: 'Financiamento Carro', creditor: 'Banco Itaú', total: 24000, paid: 8400, installment: 800, remaining: 19, dueDay: 5, rate: 1.49 },
  { id: 2, name: 'Empréstimo Pessoal', creditor: 'Nubank', total: 5000, paid: 2000, installment: 416.67, remaining: 7, dueDay: 10, rate: 2.1 },
  { id: 3, name: 'Parcelamento TV', creditor: 'Casas Bahia', total: 2800, paid: 1680, installment: 280, remaining: 4, dueDay: 20, rate: 0 },
];

const DebtCard: React.FC<{ debt: Debt }> = ({ debt }) => {
  const pct = Math.round((debt.paid / debt.total) * 100);
  const remaining = debt.total - debt.paid;
  return (
    <div className="bg-white rounded-xl p-5" style={{ border: '1px solid #E8E4FF', boxShadow: '0 1px 3px rgba(124,92,252,0.06)' }}>
      <div className="flex justify-between items-start mb-3.5">
        <div>
          <div className="text-sm font-bold" style={{ color: '#0D0D1A' }}>{debt.name}</div>
          <div className="text-xs mt-0.5" style={{ color: '#9090B0' }}>{debt.creditor} · Vence dia {debt.dueDay}</div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: '#FFF5F3', color: '#DC4F3A' }}>Ativa</span>
      </div>
      <div className="flex justify-between mb-2.5">
        <div>
          <div className="text-xs" style={{ color: '#9090B0' }}>Saldo devedor</div>
          <div className="text-xl font-extrabold" style={{ color: '#DC4F3A', letterSpacing: '-0.025em' }}>{fmtBRL(remaining)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs" style={{ color: '#9090B0' }}>Parcela mensal</div>
          <div className="text-lg font-bold" style={{ color: '#0D0D1A' }}>{fmtBRL(debt.installment)}</div>
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ backgroundColor: '#F5F3FF' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: '#059669' }} />
      </div>
      <div className="flex justify-between text-xs" style={{ color: '#9090B0' }}>
        <span>{pct}% quitado</span>
        <span>{debt.remaining}x restantes{debt.rate > 0 ? ` · ${debt.rate}% a.m.` : ' · Sem juros'}</span>
      </div>
    </div>
  );
};

const Debts: React.FC = () => {
  const totalDebt = mockDebts.reduce((s, d) => s + (d.total - d.paid), 0);
  const totalMonthly = mockDebts.reduce((s, d) => s + d.installment, 0);
  const highestRate = [...mockDebts].sort((a, b) => b.rate - a.rate)[0];

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0D0D1A', letterSpacing: '-0.025em' }}>Dívidas</h1>
          <p className="text-sm mt-0.5" style={{ color: '#9090B0' }}>Financiamentos e parcelamentos</p>
        </div>
        <button
          className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
          style={{ backgroundColor: '#7C5CFC', boxShadow: '0 4px 12px rgba(124,92,252,0.3)' }}
        >
          <Plus className="w-4 h-4" /> Registrar Dívida
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-5">
        <div className="rounded-xl p-5 text-white" style={{ background: 'linear-gradient(135deg,#DC4F3A,#C03E2A)', boxShadow: '0 4px 16px rgba(220,79,58,0.3)' }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>Total Devedor</div>
          <div className="text-3xl font-extrabold" style={{ letterSpacing: '-0.025em' }}>{fmtBRL(totalDebt)}</div>
        </div>
        <div className="bg-white rounded-xl p-5" style={{ border: '1px solid #E8E4FF', boxShadow: '0 1px 3px rgba(124,92,252,0.06)' }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: '#9090B0' }}>Custo Mensal</div>
          <div className="text-3xl font-extrabold" style={{ color: '#DC4F3A', letterSpacing: '-0.025em' }}>{fmtBRL(totalMonthly)}</div>
        </div>
        <div className="bg-white rounded-xl p-5" style={{ border: '1px solid #E8E4FF', boxShadow: '0 1px 3px rgba(124,92,252,0.06)' }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: '#9090B0' }}>Dívidas Ativas</div>
          <div className="text-3xl font-extrabold" style={{ color: '#0D0D1A' }}>{mockDebts.length}</div>
        </div>
      </div>

      {/* Debt Cards + Tip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockDebts.map(d => <DebtCard key={d.id} debt={d} />)}
        <div className="rounded-xl p-5" style={{ backgroundColor: '#F5F3FF', border: '1px solid #E8E4FF' }}>
          <div className="flex items-center gap-2 text-sm font-bold mb-2" style={{ color: '#7C5CFC' }}>
            <Lightbulb className="w-4 h-4" /> Dica do Orçavi
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#4B4B6B' }}>
            Você tem <strong>{fmtBRL(totalMonthly)}</strong> de comprometimento mensal com dívidas.
            {highestRate.rate > 0 && (
              <> Priorize quitar o <strong>{highestRate.name}</strong> que tem a maior taxa de juros ({highestRate.rate}% a.m.) para economizar mais rápido.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Debts;
