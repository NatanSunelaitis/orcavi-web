import React, { useState, useEffect } from 'react';
import { Plus, X, Trash2, Lightbulb } from 'lucide-react';
import PlanGate from './PlanGate';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Debt {
  id: string;
  name: string;
  creditor: string;
  total_amount: number;
  paid_amount: number;
  monthly_installment: number;
  remaining_installments: number;
  due_day: number;
  interest_rate: number;
}

const Debts: React.FC = () => {
  const { user } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '', creditor: '', total_amount: '', monthly_installment: '',
    remaining_installments: '', due_day: '5', interest_rate: '0',
  });

  const loadDebts = async () => {
    if (!user) return;
    const { data } = await supabase.from('debts').select('*').eq('user_id', user.uid).order('created_at');
    setDebts((data ?? []) as Debt[]);
    setLoading(false);
  };

  useEffect(() => { loadDebts(); }, [user]);

  const saveDebt = async () => {
    if (!user || !form.name || !form.total_amount || !form.monthly_installment || !form.remaining_installments) return;
    const total = Number(form.total_amount);
    const monthly = Number(form.monthly_installment);
    const remaining = Number(form.remaining_installments);
    const paid = Math.max(0, total - (monthly * remaining));

    await supabase.from('debts').insert({
      user_id: user.uid,
      name: form.name,
      creditor: form.creditor,
      total_amount: total,
      paid_amount: paid,
      monthly_installment: monthly,
      remaining_installments: remaining,
      due_day: Number(form.due_day),
      interest_rate: Number(form.interest_rate),
    });
    setShowModal(false);
    setForm({ name: '', creditor: '', total_amount: '', monthly_installment: '', remaining_installments: '', due_day: '5', interest_rate: '0' });
    loadDebts();
  };

  const deleteDebt = async (id: string) => {
    if (!confirm('Excluir esta dívida?')) return;
    await supabase.from('debts').delete().eq('id', id);
    loadDebts();
  };

  const payInstallment = async (debt: Debt) => {
    if (debt.remaining_installments <= 0) return;
    await supabase.from('debts').update({
      paid_amount: debt.paid_amount + debt.monthly_installment,
      remaining_installments: debt.remaining_installments - 1,
    }).eq('id', debt.id);
    loadDebts();
  };

  const totalDebt = debts.reduce((s, d) => s + (d.total_amount - d.paid_amount), 0);
  const totalMonthly = debts.reduce((s, d) => s + d.monthly_installment, 0);
  const highestRate = debts.length > 0 ? [...debts].sort((a, b) => b.interest_rate - a.interest_rate)[0] : null;

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E8E4FF', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#6B6B9A', marginBottom: 4, display: 'block' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0D0D1A', letterSpacing: '-0.025em', margin: 0 }}>Dívidas</h1>
          <p style={{ fontSize: 13, color: '#9090B0', margin: '4px 0 0' }}>Financiamentos e parcelamentos</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: 'none', background: '#7C5CFC', fontSize: 13, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(124,92,252,0.3)' }}>
          <Plus size={15} /> Registrar Dívida
        </button>
      </div>

      {/* KPIs */}
      {debts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          <div style={{ borderRadius: 14, padding: '18px 20px', color: 'white', background: 'linear-gradient(135deg,#DC4F3A,#C03E2A)', boxShadow: '0 4px 16px rgba(220,79,58,0.3)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>Total devedor</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em' }}>{fmtBRL(totalDebt)}</div>
          </div>
          <div style={{ borderRadius: 14, padding: '18px 20px', background: 'white', border: '1px solid #E8E4FF' }}>
            <div style={{ fontSize: 11, color: '#9090B0', marginBottom: 4 }}>Custo mensal</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0D0D1A', letterSpacing: '-0.025em' }}>{fmtBRL(totalMonthly)}</div>
          </div>
          <div style={{ borderRadius: 14, padding: '18px 20px', background: 'white', border: '1px solid #E8E4FF' }}>
            <div style={{ fontSize: 11, color: '#9090B0', marginBottom: 4 }}>Dívidas ativas</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0D0D1A', letterSpacing: '-0.025em' }}>{debts.length}</div>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#9090B0', textAlign: 'center', padding: 48 }}>Carregando...</p>
      ) : debts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 64, background: 'white', borderRadius: 16, border: '2px dashed #E8E4FF' }}>
          <p style={{ fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>Nenhuma dívida registrada</p>
          <p style={{ fontSize: 13, color: '#9090B0', marginBottom: 20 }}>Registre seus financiamentos e parcelamentos para ter controle total</p>
          <button onClick={() => setShowModal(true)} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#7C5CFC', color: 'white', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Registrar primeira dívida
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {debts.map(debt => {
            const remaining = debt.total_amount - debt.paid_amount;
            const pct = Math.round((debt.paid_amount / debt.total_amount) * 100);
            return (
              <div key={debt.id} style={{ background: 'white', borderRadius: 14, padding: 20, border: '1px solid #E8E4FF', boxShadow: '0 1px 3px rgba(124,92,252,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0D0D1A' }}>{debt.name}</div>
                    <div style={{ fontSize: 12, color: '#9090B0', marginTop: 2 }}>{debt.creditor || 'Sem credor'} · Vence dia {debt.due_day}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, backgroundColor: debt.remaining_installments > 0 ? '#FFF5F3' : '#ECFDF5', color: debt.remaining_installments > 0 ? '#DC4F3A' : '#059669' }}>
                      {debt.remaining_installments > 0 ? 'Ativa' : 'Quitada'}
                    </span>
                    <button onClick={() => deleteDebt(debt.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9090B0' }}><Trash2 size={13} /></button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#9090B0' }}>Saldo devedor</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#DC4F3A', letterSpacing: '-0.025em' }}>{fmtBRL(remaining)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#9090B0' }}>Parcela mensal</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0D0D1A' }}>{fmtBRL(debt.monthly_installment)}</div>
                  </div>
                </div>
                <div style={{ height: 6, borderRadius: 99, overflow: 'hidden', background: '#F5F3FF', marginBottom: 6 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: '#059669', borderRadius: 99 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9090B0', marginBottom: 12 }}>
                  <span>{pct}% quitado</span>
                  <span>{debt.remaining_installments}x restantes{debt.interest_rate > 0 ? ` · ${debt.interest_rate}% a.m.` : ' · Sem juros'}</span>
                </div>
                {debt.remaining_installments > 0 && (
                  <button onClick={() => payInstallment(debt)} style={{ width: '100%', padding: '8px', borderRadius: 10, border: '1.5px solid #7C5CFC', background: 'white', color: '#7C5CFC', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Registrar pagamento da parcela
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dica */}
      {highestRate && highestRate.interest_rate > 0 && (
        <div style={{ marginTop: 20, background: '#EDE9FE', borderRadius: 14, padding: '14px 18px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Lightbulb size={16} color="#7C5CFC" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 13, color: '#5B21B6', margin: 0 }}>
            <strong>Dica:</strong> Priorize quitar <strong>{highestRate.name}</strong> primeiro — taxa de {highestRate.interest_rate}% a.m. é a mais cara da lista.
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Registrar Dívida</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9090B0' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={labelStyle}>Nome da dívida *</label><input style={inputStyle} placeholder="Ex: Financiamento Carro" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><label style={labelStyle}>Credor</label><input style={inputStyle} placeholder="Ex: Banco Itaú" value={form.creditor} onChange={e => setForm(f => ({ ...f, creditor: e.target.value }))} /></div>
              <div><label style={labelStyle}>Valor total da dívida *</label><input style={inputStyle} type="number" placeholder="24000" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} /></div>
              <div><label style={labelStyle}>Valor da parcela mensal *</label><input style={inputStyle} type="number" placeholder="800" value={form.monthly_installment} onChange={e => setForm(f => ({ ...f, monthly_installment: e.target.value }))} /></div>
              <div><label style={labelStyle}>Parcelas restantes *</label><input style={inputStyle} type="number" placeholder="19" value={form.remaining_installments} onChange={e => setForm(f => ({ ...f, remaining_installments: e.target.value }))} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Dia de vencimento</label><input style={inputStyle} type="number" min={1} max={31} value={form.due_day} onChange={e => setForm(f => ({ ...f, due_day: e.target.value }))} /></div>
                <div><label style={labelStyle}>Taxa de juros (% a.m.)</label><input style={inputStyle} type="number" step="0.01" placeholder="0" value={form.interest_rate} onChange={e => setForm(f => ({ ...f, interest_rate: e.target.value }))} /></div>
              </div>
            </div>
            <button onClick={saveDebt} style={{ width: '100%', marginTop: 20, padding: '12px', borderRadius: 12, border: 'none', background: '#7C5CFC', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
              Salvar Dívida
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const DebtsGated: React.FC = () => (
  <PlanGate requiredPlan="pro"><Debts /></PlanGate>
);

export default DebtsGated;
