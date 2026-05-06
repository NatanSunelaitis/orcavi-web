import React, { useState, useEffect } from 'react';
import {
  Briefcase, Plus, X, ChevronLeft, ChevronRight, ArrowRight,
  TrendingUp, TrendingDown, DollarSign, Zap, Trash2, Check,
  PiggyBank, ArrowUpRight, RotateCcw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import PlanGate from './PlanGate';

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const todayStr = () => new Date().toISOString().split('T')[0];

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E8E4FF', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#6B6B9A', marginBottom: 4, display: 'block' };

const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// ─── Profession configs ────────────────────────────────────────────────────
interface DefaultFund { name: string; rule_type: 'percent' | 'per_unit'; rule_value: number; emoji: string; color: string; }
interface ProfessionConfig {
  id: string; label: string; icon: string; unitLabel: string;
  assetPlaceholder: string; expenseCategories: string[];
  defaultFunds: DefaultFund[];
}

const PROFESSION_TYPES: ProfessionConfig[] = [
  {
    id: 'transport', label: 'Motorista / Entregador', icon: '🚗', unitLabel: 'KM',
    assetPlaceholder: 'Ex: Carro Ônix 2020, Moto Honda',
    expenseCategories: ['Combustível', 'Manutenção', 'Lavagem', 'Multa', 'Outros'],
    defaultFunds: [
      { name: 'Manutenção do Veículo', rule_type: 'per_unit', rule_value: 0.15, emoji: '🔧', color: '#DC4F3A' },
      { name: 'Depreciação', rule_type: 'per_unit', rule_value: 0.10, emoji: '📉', color: '#F59E0B' },
    ],
  },
  {
    id: 'it', label: 'Dev / Freelancer TI', icon: '💻', unitLabel: 'Horas',
    assetPlaceholder: 'Ex: MacBook Pro M3',
    expenseCategories: ['Software/SaaS', 'Hardware', 'Nuvem/Servidor', 'Treinamento', 'Outros'],
    defaultFunds: [
      { name: 'Impostos (DAS/IR)', rule_type: 'percent', rule_value: 11, emoji: '🏛️', color: '#DC4F3A' },
      { name: 'Fundo de Reserva', rule_type: 'percent', rule_value: 10, emoji: '🏦', color: '#059669' },
    ],
  },
  {
    id: 'beauty', label: 'Profissional de Beleza', icon: '✂️', unitLabel: 'Atendimentos',
    assetPlaceholder: 'Ex: Equipamentos de salão',
    expenseCategories: ['Insumos', 'Comissão do Espaço', 'Taxa Maquininha', 'Equipamentos', 'Outros'],
    defaultFunds: [
      { name: 'Reposição de Insumos', rule_type: 'percent', rule_value: 8, emoji: '🧴', color: '#E8875A' },
      { name: 'Impostos', rule_type: 'percent', rule_value: 6, emoji: '🏛️', color: '#DC4F3A' },
    ],
  },
  {
    id: 'health', label: 'Médico / Prof. de Saúde', icon: '🩺', unitLabel: 'Plantões',
    assetPlaceholder: 'Ex: Consultório, Equipamentos',
    expenseCategories: ['Materiais', 'Contador/CRM', 'Cursos', 'Deslocamento', 'Outros'],
    defaultFunds: [
      { name: 'Impostos (DAS/IR)', rule_type: 'percent', rule_value: 10, emoji: '🏛️', color: '#DC4F3A' },
      { name: 'Custos Fixos (Contador)', rule_type: 'percent', rule_value: 5, emoji: '📋', color: '#2E86AB' },
      { name: 'Fundo de Férias', rule_type: 'percent', rule_value: 10, emoji: '🏖️', color: '#059669' },
    ],
  },
  {
    id: 'sales', label: 'Vendedor / Representante', icon: '🛍️', unitLabel: 'Pedidos',
    assetPlaceholder: 'Ex: Carro, Tablet de vendas',
    expenseCategories: ['Deslocamento', 'Capital de Giro', 'Comissão', 'Outros'],
    defaultFunds: [
      { name: 'Capital de Giro', rule_type: 'percent', rule_value: 15, emoji: '💰', color: '#059669' },
      { name: 'Impostos', rule_type: 'percent', rule_value: 6, emoji: '🏛️', color: '#DC4F3A' },
    ],
  },
  {
    id: 'other', label: 'Outro / Personalizado', icon: '⚡', unitLabel: 'Serviços',
    assetPlaceholder: 'Ex: Equipamento principal',
    expenseCategories: ['Operacional', 'Pessoal', 'Equipamentos', 'Outros'],
    defaultFunds: [],
  },
];

// ─── Types ─────────────────────────────────────────────────────────────────
interface Profile {
  id: string; profession_type: string; profession_label: string;
  unit_label: string; asset_name?: string; wear_rate_per_unit: number;
}
interface Transaction {
  id: string; type: 'revenue' | 'expense' | 'prolabore';
  description: string; gross_amount: number; units: number;
  category: string; date: string;
}
interface Fund {
  id: string; name: string; rule_type: 'percent' | 'per_unit' | 'fixed';
  rule_value: number; balance: number; color: string; emoji: string;
}
interface PersonalAccount { id: string; name: string; balance: number; }
interface ReserveCalc { fundId: string; name: string; emoji: string; color: string; amount: number; }

// ─── Main component ────────────────────────────────────────────────────────
const BusinessInner: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [personalAccounts, setPersonalAccounts] = useState<PersonalAccount[]>([]);

  const [activeTab, setActiveTab] = useState<'inicio' | 'transacoes' | 'reservas'>('inicio');
  const [txFilter, setTxFilter] = useState<'all' | 'revenue' | 'expense' | 'prolabore'>('all');
  const [selectedMonth, setSelectedMonth] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() }; });

  // Onboarding
  const [onboardStep, setOnboardStep] = useState(1);
  const [obType, setObType] = useState('');
  const [obAsset, setObAsset] = useState('');
  const [obFunds, setObFunds] = useState<DefaultFund[]>([]);
  const [obSaving, setObSaving] = useState(false);

  // Express entry modal
  const [showEntry, setShowEntry] = useState(false);
  const [entryGross, setEntryGross] = useState('');
  const [entryUnits, setEntryUnits] = useState('');
  const [entryExpense, setEntryExpense] = useState('');
  const [entryExpenseCat, setEntryExpenseCat] = useState('Outros');
  const [entryExpenseDesc, setEntryExpenseDesc] = useState('');
  const [entryDate, setEntryDate] = useState(todayStr());
  const [entryPreview, setEntryPreview] = useState<ReserveCalc[] | null>(null);
  const [entryLoading, setEntryLoading] = useState(false);

  // Pro-labore modal
  const [showProlabore, setShowProlabore] = useState(false);
  const [prolaboreAmount, setProlaboreAmount] = useState('');
  const [prolaboreAccount, setProlaboreAccount] = useState('');
  const [prolaboreLoading, setProlaboreLoading] = useState(false);

  // Fund modal
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundForm, setFundForm] = useState({ name: '', rule_type: 'percent' as 'percent' | 'per_unit' | 'fixed', rule_value: '', emoji: '🏦', color: '#059669' });

  // ─── Load ────────────────────────────────────────────────────────────────
  const loadAll = async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: prof }, { data: txs }, { data: fds }, { data: accs }] = await Promise.all([
      supabase.from('business_profiles').select('*').eq('user_id', user.uid).maybeSingle(),
      supabase.from('business_transactions').select('*').eq('user_id', user.uid).order('created_at', { ascending: false }),
      supabase.from('business_reserve_funds').select('*').eq('user_id', user.uid).order('created_at'),
      supabase.from('accounts').select('id, name, balance').eq('user_id', user.uid).order('name'),
    ]);

    setProfile(prof ?? null);
    setTransactions(((txs ?? []) as Transaction[]).map(t => ({ ...t, gross_amount: Number(t.gross_amount), units: Number(t.units) })));
    setFunds(((fds ?? []) as Fund[]).map(f => ({ ...f, rule_value: Number(f.rule_value), balance: Number(f.balance) })));
    setPersonalAccounts((accs ?? []) as PersonalAccount[]);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [user]);

  // ─── Computed ─────────────────────────────────────────────────────────────
  const { year: aYear, month: aMonth } = selectedMonth;
  const nowDate = new Date();
  const isCurrentMonth = aYear === nowDate.getFullYear() && aMonth === nowDate.getMonth();
  const inMonth = (d: string) => { const dt = new Date(d + 'T00:00:00'); return dt.getFullYear() === aYear && dt.getMonth() === aMonth; };

  const monthRevenue = transactions.filter(t => t.type === 'revenue' && inMonth(t.date)).reduce((s, t) => s + t.gross_amount, 0);
  const monthExpenses = transactions.filter(t => t.type === 'expense' && inMonth(t.date)).reduce((s, t) => s + t.gross_amount, 0);
  const monthUnits = transactions.filter(t => t.type === 'revenue' && inMonth(t.date)).reduce((s, t) => s + t.units, 0);

  const totalRevenue = transactions.filter(t => t.type === 'revenue').reduce((s, t) => s + t.gross_amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.gross_amount, 0);
  const totalReserves = funds.reduce((s, f) => s + f.balance, 0);
  const totalProlabore = transactions.filter(t => t.type === 'prolabore').reduce((s, t) => s + t.gross_amount, 0);
  const available = Math.max(0, totalRevenue - totalExpenses - totalReserves - totalProlabore);

  const profConfig = PROFESSION_TYPES.find(p => p.id === profile?.profession_type);
  const filteredTx = transactions.filter(t => {
    if (!inMonth(t.date)) return false;
    if (txFilter === 'all') return true;
    return t.type === txFilter;
  });

  // ─── Reserve calc ─────────────────────────────────────────────────────────
  const calcReserves = (gross: number, units: number): ReserveCalc[] =>
    funds.map(f => {
      let amount = 0;
      if (f.rule_type === 'percent') amount = gross * f.rule_value / 100;
      else if (f.rule_type === 'per_unit') amount = units * f.rule_value;
      else amount = f.rule_value;
      return { fundId: f.id, name: f.name, emoji: f.emoji, color: f.color, amount: +amount.toFixed(2) };
    }).filter(r => r.amount > 0);

  // ─── Onboarding ───────────────────────────────────────────────────────────
  const selectProfType = (typeId: string) => {
    const cfg = PROFESSION_TYPES.find(p => p.id === typeId)!;
    setObType(typeId);
    setObFunds(cfg.defaultFunds.map(f => ({ ...f })));
    setOnboardStep(2);
  };

  const finishOnboarding = async () => {
    if (!user || !obType) return;
    const cfg = PROFESSION_TYPES.find(p => p.id === obType)!;
    setObSaving(true);

    const { error } = await supabase.from('business_profiles').insert({
      user_id: user.uid,
      profession_type: obType,
      profession_label: cfg.label,
      unit_label: cfg.unitLabel,
      asset_name: obAsset || null,
      wear_rate_per_unit: 0,
    });

    if (!error) {
      for (const f of obFunds) {
        await supabase.from('business_reserve_funds').insert({ user_id: user.uid, name: f.name, rule_type: f.rule_type, rule_value: f.rule_value, emoji: f.emoji, color: f.color });
      }
      await loadAll();
    }
    setObSaving(false);
  };

  // ─── Express entry ────────────────────────────────────────────────────────
  const previewEntry = () => {
    const gross = Number(entryGross);
    const units = Number(entryUnits);
    if (!gross) return;
    setEntryPreview(calcReserves(gross, units));
  };

  const confirmEntry = async () => {
    if (!user || !profile || !entryGross) return;
    const gross = Number(entryGross);
    const units = Number(entryUnits);
    const expense = Number(entryExpense);
    const reserves = entryPreview ?? calcReserves(gross, units);
    setEntryLoading(true);

    // 1. Revenue transaction
    const { data: revTx } = await supabase.from('business_transactions').insert({
      user_id: user.uid, type: 'revenue',
      description: `Receita — ${profile.unit_label}: ${units || 0}`,
      gross_amount: gross, units, category: 'Receita', date: entryDate,
    }).select().single();

    // 2. Expense transaction (if any)
    if (expense > 0) {
      await supabase.from('business_transactions').insert({
        user_id: user.uid, type: 'expense',
        description: entryExpenseDesc || entryExpenseCat,
        gross_amount: expense, units: 0, category: entryExpenseCat, date: entryDate,
      });
    }

    // 3. Reserve deposits
    for (const r of reserves) {
      await supabase.from('business_reserve_funds').update({ balance: supabase.rpc as any }).eq('id', r.fundId);
      // Simpler: fetch current balance then update
      const fund = funds.find(f => f.id === r.fundId);
      if (fund) {
        await supabase.from('business_reserve_funds').update({ balance: fund.balance + r.amount }).eq('id', r.fundId);
        if (revTx) {
          await supabase.from('business_reserve_movements').insert({ fund_id: r.fundId, transaction_id: revTx.id, amount: r.amount, description: `Reserva automática — ${r.name}` });
        }
      }
    }

    setShowEntry(false);
    setEntryGross(''); setEntryUnits(''); setEntryExpense(''); setEntryExpenseDesc(''); setEntryPreview(null); setEntryDate(todayStr());
    setEntryLoading(false);
    await loadAll();
  };

  // ─── Pro-labore ───────────────────────────────────────────────────────────
  const transferProlabore = async () => {
    if (!user || !prolaboreAmount || !prolaboreAccount) return;
    const amount = Number(prolaboreAmount);
    if (amount <= 0 || amount > available) return;
    setProlaboreLoading(true);

    // Outflow from business
    await supabase.from('business_transactions').insert({
      user_id: user.uid, type: 'prolabore',
      description: 'Pró-labore — transferência para conta pessoal',
      gross_amount: amount, units: 0, category: 'Pró-labore', date: todayStr(),
    });

    // Inflow to personal finance
    const { data: acct } = await supabase.from('accounts').select('balance').eq('id', prolaboreAccount).single();
    if (acct) {
      await Promise.all([
        supabase.from('accounts').update({ balance: Number(acct.balance) + amount }).eq('id', prolaboreAccount),
        supabase.from('transactions').insert({
          user_id: user.uid, account_id: prolaboreAccount,
          type: 'income', category: 'Pró-labore',
          description: `Pró-labore — ${profile?.profession_label ?? 'Negócio'}`,
          amount, date: todayStr(), is_paid: true,
        }),
      ]);
    }

    setProlaboreLoading(false);
    setShowProlabore(false);
    setProlaboreAmount('');
    await loadAll();
  };

  // ─── Fund CRUD ────────────────────────────────────────────────────────────
  const addFund = async () => {
    if (!user || !fundForm.name || !fundForm.rule_value) return;
    await supabase.from('business_reserve_funds').insert({ user_id: user.uid, name: fundForm.name, rule_type: fundForm.rule_type, rule_value: Number(fundForm.rule_value), emoji: fundForm.emoji, color: fundForm.color, balance: 0 });
    setShowFundModal(false);
    setFundForm({ name: '', rule_type: 'percent', rule_value: '', emoji: '🏦', color: '#059669' });
    await loadAll();
  };

  const deleteFund = async (id: string) => {
    if (!confirm('Excluir este fundo? O saldo será perdido.')) return;
    await supabase.from('business_reserve_funds').delete().eq('id', id);
    await loadAll();
  };

  const resetProfile = async () => {
    if (!user || !confirm('Redefinir perfil profissional? Todos os dados do módulo serão excluídos.')) return;
    await supabase.from('business_reserve_funds').delete().eq('user_id', user.uid);
    await supabase.from('business_transactions').delete().eq('user_id', user.uid);
    await supabase.from('business_profiles').delete().eq('user_id', user.uid);
    setProfile(null); setTransactions([]); setFunds([]);
    setOnboardStep(1); setObType(''); setObAsset(''); setObFunds([]);
  };

  if (loading) return <p style={{ color: '#9090B0', textAlign: 'center', padding: 64 }}>Carregando...</p>;

  // ─── ONBOARDING ───────────────────────────────────────────────────────────
  if (!profile) return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg,#7C5CFC,#6D28D9)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(124,92,252,0.3)' }}>
          <Briefcase size={28} color="white" />
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0D0D1A', margin: '0 0 8px', letterSpacing: '-0.025em' }}>Módulo Autônomo / PJ</h1>
        <p style={{ fontSize: 14, color: '#9090B0' }}>Separe as finanças do seu negócio das suas finanças pessoais</p>
      </div>

      {onboardStep === 1 && (
        <>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 16 }}>Qual é a sua área de atuação?</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {PROFESSION_TYPES.map(p => (
              <button key={p.id} onClick={() => selectProfType(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderRadius: 14, border: '2px solid #E8E4FF', background: 'white', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#7C5CFC'; (e.currentTarget as HTMLButtonElement).style.background = '#F5F3FF'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E8E4FF'; (e.currentTarget as HTMLButtonElement).style.background = 'white'; }}>
                <span style={{ fontSize: 28 }}>{p.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0D0D1A' }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: '#9090B0', marginTop: 2 }}>Unidade: {p.unitLabel}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {onboardStep === 2 && (() => {
        const cfg = PROFESSION_TYPES.find(p => p.id === obType)!;
        return (
          <>
            <button onClick={() => setOnboardStep(1)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B6B9A', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20 }}>
              <ChevronLeft size={15} /> Voltar
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: '14px 18px', background: '#F5F3FF', borderRadius: 12 }}>
              <span style={{ fontSize: 32 }}>{cfg.icon}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0D0D1A' }}>{cfg.label}</div>
                <div style={{ fontSize: 12, color: '#9090B0' }}>Unidade de medida: <strong>{cfg.unitLabel}</strong></div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>{cfg.id === 'other' ? 'Nome do seu negócio' : 'Qual é o seu ativo principal?'}</label>
              <input style={inp} placeholder={cfg.assetPlaceholder} value={obAsset} onChange={e => setObAsset(e.target.value)} autoFocus />
              <p style={{ fontSize: 11, color: '#9090B0', marginTop: 4 }}>Opcional — ajuda nas métricas de desempenho</p>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <label style={{ ...lbl, marginBottom: 0 }}>Fundos de reserva automáticos</label>
                {obFunds.length > 0 && <span style={{ fontSize: 11, color: '#9090B0' }}>Edite os valores se necessário</span>}
              </div>
              {obFunds.length === 0 && (
                <div style={{ padding: '16px', background: '#F9F8FF', borderRadius: 10, border: '1.5px dashed #E8E4FF', textAlign: 'center', marginBottom: 10 }}>
                  <p style={{ fontSize: 13, color: '#9090B0', margin: 0 }}>Sem fundos sugeridos — você pode adicionar depois</p>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {obFunds.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', borderRadius: 10, padding: '12px 14px', border: '1px solid #E8E4FF' }}>
                    <span style={{ fontSize: 20 }}>{f.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0D0D1A' }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: '#9090B0' }}>
                        {f.rule_type === 'percent' ? `${f.rule_value}% da receita bruta` : `R$ ${f.rule_value} por ${cfg.unitLabel.toLowerCase()}`}
                      </div>
                    </div>
                    <input type="number" value={f.rule_value} onChange={e => setObFunds(fs => fs.map((x, j) => j === i ? { ...x, rule_value: Number(e.target.value) } : x))} style={{ width: 70, ...inp, padding: '6px 8px', textAlign: 'center' }} />
                    <span style={{ fontSize: 12, color: '#9090B0' }}>{f.rule_type === 'percent' ? '%' : `R$/${cfg.unitLabel.toLowerCase()}`}</span>
                    <button onClick={() => setObFunds(fs => fs.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB' }}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={finishOnboarding} disabled={obSaving} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#7C5CFC,#6D28D9)', color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(124,92,252,0.35)' }}>
              {obSaving ? 'Configurando...' : 'Começar a usar →'}
            </button>
          </>
        );
      })()}
    </div>
  );

  // ─── DASHBOARD ────────────────────────────────────────────────────────────
  const grossPct = monthRevenue > 0 ? 100 : 0;
  const expPct = monthRevenue > 0 ? (monthExpenses / monthRevenue) * 100 : 0;
  const resPct = monthRevenue > 0 ? (funds.reduce((s, f) => {
    if (f.rule_type === 'percent') return s + (monthRevenue * f.rule_value / 100);
    if (f.rule_type === 'per_unit') return s + (monthUnits * f.rule_value);
    return s + f.rule_value;
  }, 0) / monthRevenue) * 100 : 0;

  const entryPreviewReserves = entryPreview ?? [];
  const entryGrossNum = Number(entryGross);
  const entryExpenseNum = Number(entryExpense);
  const entryReserveTotal = entryPreviewReserves.reduce((s, r) => s + r.amount, 0);
  const entryNet = entryGrossNum - entryExpenseNum - entryReserveTotal;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg,#7C5CFC,#6D28D9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Briefcase size={19} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0D0D1A', margin: 0, letterSpacing: '-0.025em' }}>Meu Negócio</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 13 }}>{profConfig?.icon}</span>
              <span style={{ fontSize: 12, color: '#9090B0', fontWeight: 500 }}>{profile.profession_label}</span>
              {profile.asset_name && <span style={{ fontSize: 11, color: '#C4B5FD' }}>· {profile.asset_name}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={resetProfile} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #E8E4FF', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Redefinir perfil">
            <RotateCcw size={14} color="#9090B0" />
          </button>
          <button onClick={() => { setProlaboreAmount(''); setProlaboreAccount(personalAccounts[0]?.id ?? ''); setShowProlabore(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(5,150,105,0.3)' }}>
            <ArrowUpRight size={15} /> Pagar-me
          </button>
          <button onClick={() => { setEntryGross(''); setEntryUnits(''); setEntryExpense(''); setEntryExpenseDesc(''); setEntryPreview(null); setEntryDate(todayStr()); setShowEntry(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#7C5CFC,#6D28D9)', fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(124,92,252,0.3)' }}>
            <Plus size={15} /> Lançar
          </button>
        </div>
      </div>

      {/* Month navigator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, background: 'white', borderRadius: 12, padding: '10px 16px', border: '1px solid #E8E4FF' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0D0D1A' }}>{MONTHS_FULL[aMonth]} {aYear}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setSelectedMonth(m => m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 })} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E8E4FF', background: '#F9F8FF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={14} color="#6B6B9A" /></button>
          <button onClick={() => { if (!isCurrentMonth) setSelectedMonth(m => m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 }); }} disabled={isCurrentMonth} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E8E4FF', background: '#F9F8FF', cursor: isCurrentMonth ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isCurrentMonth ? 0.35 : 1 }}><ChevronRight size={14} color="#6B6B9A" /></button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <div style={{ borderRadius: 14, padding: '16px 18px', background: 'white', border: '1px solid #E8E4FF' }}>
          <div style={{ fontSize: 11, color: '#9090B0', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><TrendingUp size={11} /> Faturamento</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>{fmtBRL(monthRevenue)}</div>
          <div style={{ fontSize: 10, color: '#9090B0', marginTop: 2 }}>{transactions.filter(t => t.type === 'revenue' && inMonth(t.date)).length} lançamentos</div>
        </div>
        <div style={{ borderRadius: 14, padding: '16px 18px', background: 'white', border: '1px solid #E8E4FF' }}>
          <div style={{ fontSize: 11, color: '#9090B0', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><TrendingDown size={11} /> Despesas</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#DC4F3A' }}>{fmtBRL(monthExpenses)}</div>
          <div style={{ fontSize: 10, color: '#9090B0', marginTop: 2 }}>{expPct > 0 ? `${expPct.toFixed(0)}% do faturamento` : 'Sem despesas'}</div>
        </div>
        <div style={{ borderRadius: 14, padding: '16px 18px', background: 'white', border: '1px solid #E8E4FF' }}>
          <div style={{ fontSize: 11, color: '#9090B0', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><PiggyBank size={11} /> Em reservas</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#7C5CFC' }}>{fmtBRL(totalReserves)}</div>
          <div style={{ fontSize: 10, color: '#9090B0', marginTop: 2 }}>{funds.length} fundo{funds.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ borderRadius: 14, padding: '16px 18px', background: available > 0 ? 'linear-gradient(135deg,#059669,#047857)' : 'white', border: available > 0 ? 'none' : '1px solid #E8E4FF', boxShadow: available > 0 ? '0 4px 16px rgba(5,150,105,0.25)' : 'none' }}>
          <div style={{ fontSize: 11, color: available > 0 ? 'rgba(255,255,255,0.75)' : '#9090B0', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><DollarSign size={11} /> Disponível</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: available > 0 ? 'white' : '#0D0D1A' }}>{fmtBRL(available)}</div>
          <div style={{ fontSize: 10, color: available > 0 ? 'rgba(255,255,255,0.65)' : '#9090B0', marginTop: 2 }}>Para pró-labore</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#F5F3FF', borderRadius: 12, padding: 4, marginBottom: 20, width: 'fit-content' }}>
        {([['inicio','Início'],['transacoes','Transações'],['reservas','Reservas']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{ padding: '8px 16px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: activeTab === key ? 'white' : 'transparent', color: activeTab === key ? '#7C5CFC' : '#6B6B9A', boxShadow: activeTab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Início ── */}
      {activeTab === 'inicio' && (
        <div>
          {/* Express entry CTA */}
          <div onClick={() => { setEntryGross(''); setEntryUnits(''); setEntryExpense(''); setEntryExpenseDesc(''); setEntryPreview(null); setEntryDate(todayStr()); setShowEntry(true); }} style={{ background: 'linear-gradient(135deg,#1A1A2E,#25253F)', borderRadius: 16, padding: '20px 24px', marginBottom: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#7C5CFC,#6D28D9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={22} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'white', marginBottom: 2 }}>⚡ Lançamento Rápido</div>
              <div style={{ fontSize: 12, color: '#6B6B9A' }}>Registre receita, gasto e o sistema calcula as reservas automaticamente</div>
            </div>
            <ArrowRight size={18} color="#6B6B9A" />
          </div>

          {/* Recent transactions */}
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Últimos lançamentos</div>
          {filteredTx.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: 14, border: '1px solid #E8E4FF' }}>
              <p style={{ color: '#9090B0', fontSize: 14, margin: 0 }}>Nenhum lançamento em {MONTHS_FULL[aMonth]}. Use o botão acima para começar.</p>
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E8E4FF', overflow: 'hidden' }}>
              {transactions.filter(t => inMonth(t.date)).slice(0, 5).map((t, i, arr) => {
                const isRev = t.type === 'revenue'; const isPL = t.type === 'prolabore';
                const color = isRev ? '#059669' : isPL ? '#7C5CFC' : '#DC4F3A';
                const sign = isRev ? '+' : '−';
                return (
                  <div key={t.id} style={{ padding: '13px 18px', borderBottom: i < arr.length - 1 ? '1px solid #F9F8FF' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isRev ? <TrendingUp size={15} color={color} /> : isPL ? <ArrowUpRight size={15} color={color} /> : <TrendingDown size={15} color={color} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0D0D1A' }}>{t.description}</div>
                        <div style={{ fontSize: 11, color: '#9090B0' }}>{t.category} · {t.date}{t.units > 0 ? ` · ${t.units} ${profile.unit_label}` : ''}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color }}>{sign}{fmtBRL(t.gross_amount)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Transações ── */}
      {activeTab === 'transacoes' && (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {([['all','Todos'],['revenue','Receitas'],['expense','Despesas'],['prolabore','Pró-labore']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setTxFilter(key)} style={{ padding: '6px 12px', borderRadius: 99, border: `1.5px solid ${txFilter === key ? '#7C5CFC' : '#E8E4FF'}`, background: txFilter === key ? '#EDE9FE' : 'white', color: txFilter === key ? '#7C5CFC' : '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {label}
              </button>
            ))}
          </div>
          {filteredTx.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: 14, border: '1px solid #E8E4FF' }}>
              <p style={{ color: '#9090B0', fontSize: 14, margin: 0 }}>Nenhum lançamento neste período.</p>
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E8E4FF', overflow: 'hidden' }}>
              {filteredTx.map((t, i) => {
                const isRev = t.type === 'revenue'; const isPL = t.type === 'prolabore';
                const color = isRev ? '#059669' : isPL ? '#7C5CFC' : '#DC4F3A';
                const sign = isRev ? '+' : '−';
                return (
                  <div key={t.id} style={{ padding: '13px 18px', borderBottom: i < filteredTx.length - 1 ? '1px solid #F9F8FF' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isRev ? <TrendingUp size={15} color={color} /> : isPL ? <ArrowUpRight size={15} color={color} /> : <TrendingDown size={15} color={color} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0D0D1A' }}>{t.description}</div>
                        <div style={{ fontSize: 11, color: '#9090B0' }}>{t.category} · {t.date}{t.units > 0 ? ` · ${t.units} ${profile.unit_label}` : ''}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color }}>{sign}{fmtBRL(t.gross_amount)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Reservas ── */}
      {activeTab === 'reservas' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <span style={{ fontSize: 13, color: '#9090B0' }}>Total acumulado: </span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#7C5CFC' }}>{fmtBRL(totalReserves)}</span>
            </div>
            <button onClick={() => setShowFundModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid #E8E4FF', background: 'white', fontSize: 12, fontWeight: 600, color: '#7C5CFC', cursor: 'pointer', fontFamily: 'inherit' }}>
              <Plus size={13} /> Novo fundo
            </button>
          </div>

          {funds.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: 14, border: '1.5px dashed #E8E4FF' }}>
              <p style={{ color: '#9090B0', fontSize: 14, margin: '0 0 16px' }}>Nenhum fundo configurado. Os fundos guardam automaticamente uma % da receita.</p>
              <button onClick={() => setShowFundModal(true)} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#7C5CFC', color: 'white', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Criar primeiro fundo</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {funds.map(f => {
                const ruleDesc = f.rule_type === 'percent' ? `${f.rule_value}% da receita` : f.rule_type === 'per_unit' ? `R$ ${f.rule_value} por ${profile.unit_label.toLowerCase()}` : `R$ ${f.rule_value} fixo`;
                return (
                  <div key={f.id} style={{ background: 'white', borderRadius: 14, padding: '18px 20px', border: '1px solid #E8E4FF', position: 'relative' }}>
                    <button onClick={() => deleteFund(f.id)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB' }}><Trash2 size={13} /></button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <span style={{ fontSize: 28 }}>{f.emoji}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0D0D1A' }}>{f.name}</div>
                        <div style={{ fontSize: 11, color: '#9090B0' }}>{ruleDesc}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: f.color, letterSpacing: '-0.02em', marginBottom: 10 }}>{fmtBRL(f.balance)}</div>
                    <div style={{ height: 6, borderRadius: 99, background: '#F5F3FF', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, totalReserves > 0 ? (f.balance / totalReserves) * 100 : 0)}%`, background: f.color, borderRadius: 99 }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#9090B0', marginTop: 6 }}>{totalReserves > 0 ? ((f.balance / totalReserves) * 100).toFixed(0) : 0}% do total em reservas</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Lançamento Expresso ── */}
      {showEntry && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 24, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Modal header */}
            <div style={{ background: 'linear-gradient(135deg,#1A1A2E,#25253F)', borderRadius: '24px 24px 0 0', padding: '24px 24px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Zap size={20} color="#A78BFA" />
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>Lançamento Rápido</span>
                </div>
                <button onClick={() => setShowEntry(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6B9A' }}><X size={18} /></button>
              </div>
              <p style={{ fontSize: 12, color: '#6B6B9A', margin: 0 }}>O sistema calcula e distribui as reservas automaticamente</p>
            </div>

            <div style={{ padding: '20px 24px 24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Quanto entrou */}
                <div>
                  <label style={{ ...lbl, color: '#0D0D1A', fontSize: 14, fontWeight: 700 }}>💰 Quanto entrou?</label>
                  <input style={{ ...inp, fontSize: 20, fontWeight: 800, color: '#059669', height: 52 }} type="number" placeholder="R$ 0,00" value={entryGross} onChange={e => { setEntryGross(e.target.value); setEntryPreview(null); }} />
                </div>

                {/* Esforço + gasto lado a lado */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ ...lbl }}>{profConfig?.icon} Quantos {profile.unit_label.toLowerCase()}?</label>
                    <input style={inp} type="number" placeholder="0" value={entryUnits} onChange={e => { setEntryUnits(e.target.value); setEntryPreview(null); }} />
                  </div>
                  <div>
                    <label style={lbl}>Data</label>
                    <input style={inp} type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
                  </div>
                </div>

                {/* Gasto imediato */}
                <div>
                  <label style={lbl}>💸 Teve gasto imediato? (opcional)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input style={inp} type="number" placeholder="R$ 0,00" value={entryExpense} onChange={e => { setEntryExpense(e.target.value); setEntryPreview(null); }} />
                    <select style={inp} value={entryExpenseCat} onChange={e => setEntryExpenseCat(e.target.value)}>
                      {(profConfig?.expenseCategories ?? ['Outros']).map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  {entryExpense && <input style={{ ...inp, marginTop: 6 }} placeholder="Descrição (opcional)" value={entryExpenseDesc} onChange={e => setEntryExpenseDesc(e.target.value)} />}
                </div>

                {/* Preview button */}
                {!entryPreview && entryGross && (
                  <button onClick={previewEntry} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '2px dashed #7C5CFC', background: '#F5F3FF', color: '#7C5CFC', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Calcular reservas automáticas →
                  </button>
                )}

                {/* Preview result */}
                {entryPreview && entryGrossNum > 0 && (
                  <div style={{ background: '#1A1A2E', borderRadius: 14, padding: '16px 18px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#A78BFA', marginBottom: 12 }}>📊 CÁLCULO AUTOMÁTICO</div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: '#6B6B9A' }}>Receita bruta</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>+{fmtBRL(entryGrossNum)}</span>
                    </div>

                    {entryExpenseNum > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, color: '#6B6B9A' }}>{entryExpenseCat}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#DC4F3A' }}>−{fmtBRL(entryExpenseNum)}</span>
                      </div>
                    )}

                    {entryPreviewReserves.length > 0 && (
                      <>
                        <div style={{ fontSize: 11, color: '#3D3D5C', margin: '8px 0 6px', fontWeight: 700 }}>Reservas automáticas:</div>
                        {entryPreviewReserves.map(r => (
                          <div key={r.fundId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: '#6B6B9A' }}>{r.emoji} {r.name}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: r.color }}>−{fmtBRL(r.amount)}</span>
                          </div>
                        ))}
                      </>
                    )}

                    <div style={{ borderTop: '1px solid #25253F', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>💚 Disponível hoje</span>
                      <span style={{ fontSize: 18, fontWeight: 800, color: entryNet > 0 ? '#059669' : '#DC4F3A' }}>{fmtBRL(Math.max(0, entryNet))}</span>
                    </div>
                  </div>
                )}

                <button onClick={confirmEntry} disabled={entryLoading || !entryGross} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: entryGross ? 'linear-gradient(135deg,#7C5CFC,#6D28D9)' : '#E8E4FF', color: entryGross ? 'white' : '#9090B0', fontWeight: 700, fontSize: 15, cursor: entryGross ? 'pointer' : 'default', fontFamily: 'inherit', boxShadow: entryGross ? '0 4px 16px rgba(124,92,252,0.3)' : 'none' }}>
                  {entryLoading ? 'Salvando...' : entryPreview ? 'Confirmar e Salvar' : 'Salvar Lançamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Pagar-me (Pró-labore) ── */}
      {showProlabore && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Distribuir Pró-labore</h3>
              <button onClick={() => setShowProlabore(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9090B0' }}><X size={18} /></button>
            </div>

            <div style={{ background: '#ECFDF5', borderRadius: 12, padding: '14px 16px', marginBottom: 20, border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginBottom: 2 }}>Saldo disponível para saque</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#059669' }}>{fmtBRL(available)}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Faturamento − Despesas − Reservas − Pró-labore anterior</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Quanto você quer transferir?</label>
                <input style={{ ...inp, fontSize: 18, fontWeight: 800 }} type="number" placeholder={`Máx. ${fmtBRL(available)}`} value={prolaboreAmount} onChange={e => setProlaboreAmount(e.target.value)} autoFocus max={available} />
                {Number(prolaboreAmount) > available && <p style={{ fontSize: 12, color: '#DC4F3A', margin: '4px 0 0', fontWeight: 600 }}>Valor maior que o disponível</p>}
              </div>
              <div>
                <label style={lbl}>Para qual conta pessoal?</label>
                <select style={inp} value={prolaboreAccount} onChange={e => setProlaboreAccount(e.target.value)}>
                  <option value="">Selecione a conta...</option>
                  {personalAccounts.map(a => <option key={a.id} value={a.id}>{a.name} · {fmtBRL(Number(a.balance))}</option>)}
                </select>
              </div>
            </div>

            <button onClick={transferProlabore} disabled={prolaboreLoading || !prolaboreAmount || !prolaboreAccount || Number(prolaboreAmount) > available || Number(prolaboreAmount) <= 0} style={{ width: '100%', marginTop: 20, padding: '14px', borderRadius: 12, border: 'none', background: (prolaboreAmount && prolaboreAccount && Number(prolaboreAmount) <= available && Number(prolaboreAmount) > 0) ? 'linear-gradient(135deg,#059669,#047857)' : '#E8E4FF', color: (prolaboreAmount && prolaboreAccount) ? 'white' : '#9090B0', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {prolaboreLoading ? 'Transferindo...' : <><Check size={16} /> Transferir para conta pessoal</>}
            </button>
            <p style={{ textAlign: 'center', fontSize: 11, color: '#9090B0', margin: '10px 0 0' }}>Aparecerá como receita "Pró-labore" nas suas finanças pessoais</p>
          </div>
        </div>
      )}

      {/* ── Modal: Novo Fundo ── */}
      {showFundModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Novo Fundo de Reserva</h3>
              <button onClick={() => setShowFundModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9090B0' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 10 }}>
                <div><label style={lbl}>Emoji</label><input style={inp} value={fundForm.emoji} onChange={e => setFundForm(f => ({ ...f, emoji: e.target.value }))} maxLength={2} /></div>
                <div><label style={lbl}>Nome *</label><input style={inp} placeholder="Ex: Imposto DAS" value={fundForm.name} onChange={e => setFundForm(f => ({ ...f, name: e.target.value }))} autoFocus /></div>
              </div>
              <div>
                <label style={lbl}>Tipo de regra</label>
                <select style={inp} value={fundForm.rule_type} onChange={e => setFundForm(f => ({ ...f, rule_type: e.target.value as 'percent' | 'per_unit' | 'fixed' }))}>
                  <option value="percent">% da receita bruta</option>
                  <option value="per_unit">R$ por {profile.unit_label.toLowerCase()}</option>
                  <option value="fixed">Valor fixo por lançamento</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Valor *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input style={{ ...inp, flex: 1 }} type="number" step="0.01" placeholder="0" value={fundForm.rule_value} onChange={e => setFundForm(f => ({ ...f, rule_value: e.target.value }))} />
                  <span style={{ fontSize: 13, color: '#9090B0', whiteSpace: 'nowrap' }}>{fundForm.rule_type === 'percent' ? '%' : `R$ / ${profile.unit_label.toLowerCase()}`}</span>
                </div>
              </div>
            </div>
            <button onClick={addFund} disabled={!fundForm.name || !fundForm.rule_value} style={{ width: '100%', marginTop: 18, padding: '12px', borderRadius: 12, border: 'none', background: (fundForm.name && fundForm.rule_value) ? 'linear-gradient(135deg,#7C5CFC,#6D28D9)' : '#E8E4FF', color: (fundForm.name && fundForm.rule_value) ? 'white' : '#9090B0', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>Criar Fundo</button>
          </div>
        </div>
      )}
    </div>
  );
};

const Business: React.FC = () => (
  <PlanGate requiredPlan="pro"><BusinessInner /></PlanGate>
);

export default Business;
