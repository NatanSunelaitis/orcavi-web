import React, { useState, useEffect } from 'react';
import {
  Briefcase, Plus, X, ChevronLeft, ChevronRight, ArrowRight,
  TrendingUp, TrendingDown, DollarSign, Zap, Trash2, Check,
  PiggyBank, ArrowUpRight, RotateCcw, Bell, Target, BarChart2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import PlanGate from './PlanGate';

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const todayStr = () => new Date().toISOString().split('T')[0];
const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E8E4FF', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#6B6B9A', marginBottom: 4, display: 'block' };

// ─── Ring progress component ───────────────────────────────────────────────
const RingProgress: React.FC<{ progress: number; size?: number; sw?: number; color?: string; bg?: string; children?: React.ReactNode }> = ({
  progress, size = 148, sw = 13, color = '#059669', bg = '#ECFDF5', children,
}) => {
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(1, Math.max(0, progress)));
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg} strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
};

// ─── Profession configs ────────────────────────────────────────────────────
interface DefaultFund { name: string; rule_type: 'percent' | 'per_unit'; rule_value: number; emoji: string; color: string; }
interface ProfessionConfig { id: string; label: string; icon: string; unitLabel: string; assetPlaceholder: string; expenseCategories: string[]; defaultFunds: DefaultFund[]; }

const PROFESSION_TYPES: ProfessionConfig[] = [
  { id: 'transport', label: 'Motorista / Entregador', icon: '🚗', unitLabel: 'KM', assetPlaceholder: 'Ex: Carro Ônix 2020, Moto Honda', expenseCategories: ['Combustível', 'Manutenção', 'Lavagem', 'Multa', 'Outros'],
    defaultFunds: [{ name: 'Manutenção do Veículo', rule_type: 'per_unit', rule_value: 0.15, emoji: '🔧', color: '#DC4F3A' }, { name: 'Depreciação', rule_type: 'per_unit', rule_value: 0.10, emoji: '📉', color: '#F59E0B' }] },
  { id: 'it', label: 'Dev / Freelancer TI', icon: '💻', unitLabel: 'Horas', assetPlaceholder: 'Ex: MacBook Pro M3', expenseCategories: ['Software/SaaS', 'Hardware', 'Nuvem/Servidor', 'Treinamento', 'Outros'],
    defaultFunds: [{ name: 'Impostos (DAS/IR)', rule_type: 'percent', rule_value: 11, emoji: '🏛️', color: '#DC4F3A' }, { name: 'Fundo de Reserva', rule_type: 'percent', rule_value: 10, emoji: '🏦', color: '#059669' }] },
  { id: 'beauty', label: 'Profissional de Beleza', icon: '✂️', unitLabel: 'Atendimentos', assetPlaceholder: 'Ex: Equipamentos de salão', expenseCategories: ['Insumos', 'Comissão do Espaço', 'Taxa Maquininha', 'Equipamentos', 'Outros'],
    defaultFunds: [{ name: 'Reposição de Insumos', rule_type: 'percent', rule_value: 8, emoji: '🧴', color: '#E8875A' }, { name: 'Impostos', rule_type: 'percent', rule_value: 6, emoji: '🏛️', color: '#DC4F3A' }] },
  { id: 'health', label: 'Médico / Prof. de Saúde', icon: '🩺', unitLabel: 'Plantões', assetPlaceholder: 'Ex: Consultório, Equipamentos', expenseCategories: ['Materiais', 'Contador/CRM', 'Cursos', 'Deslocamento', 'Outros'],
    defaultFunds: [{ name: 'Impostos (DAS/IR)', rule_type: 'percent', rule_value: 10, emoji: '🏛️', color: '#DC4F3A' }, { name: 'Custos Fixos (Contador)', rule_type: 'percent', rule_value: 5, emoji: '📋', color: '#2E86AB' }, { name: 'Fundo de Férias', rule_type: 'percent', rule_value: 10, emoji: '🏖️', color: '#059669' }] },
  { id: 'sales', label: 'Vendedor / Representante', icon: '🛍️', unitLabel: 'Pedidos', assetPlaceholder: 'Ex: Carro, Tablet de vendas', expenseCategories: ['Deslocamento', 'Capital de Giro', 'Comissão', 'Outros'],
    defaultFunds: [{ name: 'Capital de Giro', rule_type: 'percent', rule_value: 15, emoji: '💰', color: '#059669' }, { name: 'Impostos', rule_type: 'percent', rule_value: 6, emoji: '🏛️', color: '#DC4F3A' }] },
  { id: 'other', label: 'Outro / Personalizado', icon: '⚡', unitLabel: 'Serviços', assetPlaceholder: 'Ex: Equipamento principal', expenseCategories: ['Operacional', 'Pessoal', 'Equipamentos', 'Outros'], defaultFunds: [] },
];

// ─── Types ─────────────────────────────────────────────────────────────────
interface Profile { id: string; profession_type: string; profession_label: string; unit_label: string; asset_name?: string; wear_rate_per_unit: number; monthly_goal?: number; working_days?: number; }
interface Transaction { id: string; type: 'revenue' | 'expense' | 'prolabore'; description: string; gross_amount: number; units: number; category: string; date: string; nf_status?: 'PENDENTE' | 'EMITIDA' | 'NAO_SE_APLICA'; }
interface Fund { id: string; name: string; rule_type: 'percent' | 'per_unit' | 'fixed'; rule_value: number; balance: number; color: string; emoji: string; }
interface PersonalAccount { id: string; name: string; balance: number; }
interface ReserveCalc { fundId: string; name: string; emoji: string; color: string; amount: number; }
interface Alert { type: string; icon: string; title: string; message: string; color: string; bg: string; }

const BusinessInner: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [personalAccounts, setPersonalAccounts] = useState<PersonalAccount[]>([]);
  const [personalMonthlyExpenses, setPersonalMonthlyExpenses] = useState(0);

  const [activeTab, setActiveTab] = useState<'inicio' | 'transacoes' | 'reservas' | 'analises'>('inicio');
  const [txFilter, setTxFilter] = useState<'all' | 'revenue' | 'expense' | 'prolabore'>('all');
  const [selectedMonth, setSelectedMonth] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() }; });
  const [goalReachedDismissed, setGoalReachedDismissed] = useState(false);

  // Onboarding
  const [onboardStep, setOnboardStep] = useState(1);
  const [obType, setObType] = useState('');
  const [obAsset, setObAsset] = useState('');
  const [obMonthlyGoal, setObMonthlyGoal] = useState('');
  const [obWorkingDays, setObWorkingDays] = useState('22');
  const [obFunds, setObFunds] = useState<DefaultFund[]>([]);
  const [obSaving, setObSaving] = useState(false);

  // Express entry
  const [showEntry, setShowEntry] = useState(false);
  const [entryGross, setEntryGross] = useState('');
  const [entryUnits, setEntryUnits] = useState('');
  const [entryExpense, setEntryExpense] = useState('');
  const [entryExpenseCat, setEntryExpenseCat] = useState('Outros');
  const [entryExpenseDesc, setEntryExpenseDesc] = useState('');
  const [entryRequiresNF, setEntryRequiresNF] = useState(true);
  const [entryDate, setEntryDate] = useState(todayStr());
  const [entryPreview, setEntryPreview] = useState<ReserveCalc[] | null>(null);
  const [entryLoading, setEntryLoading] = useState(false);

  // Pro-labore
  const [showProlabore, setShowProlabore] = useState(false);
  const [prolaboreAmount, setProlaboreAmount] = useState('');
  const [prolaboreAccount, setProlaboreAccount] = useState('');
  const [prolaboreLoading, setProlaboreLoading] = useState(false);

  // Fund modal
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundForm, setFundForm] = useState({ name: '', rule_type: 'percent' as 'percent' | 'per_unit' | 'fixed', rule_value: '', emoji: '🏦', color: '#059669' });

  // Goal modal
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalForm, setGoalForm] = useState({ monthly_goal: '', working_days: '22' });

  // ─── Load ────────────────────────────────────────────────────────────────
  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const [{ data: prof }, { data: txs }, { data: fds }, { data: accs }, { data: pExpenses }] = await Promise.all([
      supabase.from('business_profiles').select('*').eq('user_id', user.uid).maybeSingle(),
      supabase.from('business_transactions').select('*').eq('user_id', user.uid).order('created_at', { ascending: false }),
      supabase.from('business_reserve_funds').select('*').eq('user_id', user.uid).order('created_at'),
      supabase.from('accounts').select('id, name, balance').eq('user_id', user.uid).order('name'),
      supabase.from('transactions').select('amount').eq('user_id', user.uid).eq('type', 'expense').eq('is_paid', true).gte('date', threeMonthsAgo.toISOString().split('T')[0]),
    ]);

    setProfile(prof ?? null);
    setTransactions(((txs ?? []) as Transaction[]).map(t => ({ ...t, gross_amount: Number(t.gross_amount), units: Number(t.units) })));
    setFunds(((fds ?? []) as Fund[]).map(f => ({ ...f, rule_value: Number(f.rule_value), balance: Number(f.balance) })));
    setPersonalAccounts((accs ?? []) as PersonalAccount[]);
    const totalPExp = (pExpenses ?? []).reduce((s: number, t: any) => s + Number(t.amount), 0);
    setPersonalMonthlyExpenses(totalPExp / 3);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [user]);

  // ─── Computed: month ─────────────────────────────────────────────────────
  const { year: aYear, month: aMonth } = selectedMonth;
  const nowDate = new Date();
  const isCurrentMonth = aYear === nowDate.getFullYear() && aMonth === nowDate.getMonth();
  const inMonth = (d: string) => { const dt = new Date(d + 'T00:00:00'); return dt.getFullYear() === aYear && dt.getMonth() === aMonth; };

  const monthRevenue = transactions.filter(t => t.type === 'revenue' && inMonth(t.date)).reduce((s, t) => s + t.gross_amount, 0);
  const monthExpenses = transactions.filter(t => t.type === 'expense' && inMonth(t.date)).reduce((s, t) => s + t.gross_amount, 0);

  const totalRevenue = transactions.filter(t => t.type === 'revenue').reduce((s, t) => s + t.gross_amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.gross_amount, 0);
  const totalReserves = funds.reduce((s, f) => s + f.balance, 0);
  const totalProlabore = transactions.filter(t => t.type === 'prolabore').reduce((s, t) => s + t.gross_amount, 0);
  const available = Math.max(0, totalRevenue - totalExpenses - totalReserves - totalProlabore);

  const profConfig = PROFESSION_TYPES.find(p => p.id === profile?.profession_type);

  // ─── Computed: daily goal ring ─────────────────────────────────────────
  const dailyGoal = profile?.monthly_goal && profile.working_days ? profile.monthly_goal / profile.working_days : null;
  const today = todayStr();
  const todayRevTxs = transactions.filter(t => t.type === 'revenue' && t.date === today);
  const todayGross = todayRevTxs.reduce((s, t) => s + t.gross_amount, 0);
  const todayUnits = todayRevTxs.reduce((s, t) => s + t.units, 0);
  const todayReserves = funds.reduce((s, f) => {
    if (f.rule_type === 'percent') return s + (todayGross * f.rule_value / 100);
    if (f.rule_type === 'per_unit') return s + (todayUnits * f.rule_value);
    return todayRevTxs.length > 0 ? s + f.rule_value : s;
  }, 0);
  const todayExpensesAmt = transactions.filter(t => t.type === 'expense' && t.date === today).reduce((s, t) => s + t.gross_amount, 0);
  const todayNet = Math.max(0, todayGross - todayReserves - todayExpensesAmt);
  const dailyProgress = dailyGoal && dailyGoal > 0 ? todayNet / dailyGoal : 0;
  const goalReached = dailyProgress >= 1 && !goalReachedDismissed && todayGross > 0;

  // ─── Computed: runway ──────────────────────────────────────────────────
  const emergencyFunds = funds.filter(f => f.name.toLowerCase().includes('férias') || f.name.toLowerCase().includes('emergencia') || f.name.toLowerCase().includes('emergência') || f.name.toLowerCase().includes('reserva'));
  const emergencyBalance = emergencyFunds.reduce((s, f) => s + f.balance, 0);
  const dailyCost = personalMonthlyExpenses > 0 ? personalMonthlyExpenses / 30 : 0;
  const runwayDays = dailyCost > 0 ? Math.floor(emergencyBalance / dailyCost) : null;

  // ─── Computed: alerts ─────────────────────────────────────────────────
  const alerts: Alert[] = [];
  if (profile?.profession_type === 'transport') {
    const totalKMs = transactions.filter(t => t.type === 'revenue').reduce((s, t) => s + t.units, 0);
    const mainFund = funds.find(f => f.name.toLowerCase().includes('manuten'));
    const kmMilestone = Math.floor(totalKMs / 10000) * 10000;
    if (totalKMs >= 10000 && totalKMs - kmMilestone < 300) {
      alerts.push({ type: 'maintenance', icon: '🔧', title: `${kmMilestone.toLocaleString()} km rodados — hora de revisar!`, message: mainFund ? `Fundo de Manutenção disponível: ${fmtBRL(mainFund.balance)}` : 'Considere fazer uma revisão preventiva.', color: '#92400E', bg: '#FEF3C7' });
    }
  }
  const taxFund = funds.find(f => f.name.toLowerCase().includes('imposto') || f.name.toLowerCase().includes('das'));
  const dayOfMonth = nowDate.getDate();
  if (taxFund && taxFund.balance > 0 && dayOfMonth >= 18 && dayOfMonth <= 25) {
    alerts.push({ type: 'tax', icon: '🏛️', title: 'Lembrete: DAS / Imposto do mês', message: `Você tem ${fmtBRL(taxFund.balance)} guardados. Verifique se há imposto a pagar.`, color: '#7C2D12', bg: '#FEE2E2' });
  }
  const vacFund = funds.find(f => f.name.toLowerCase().includes('férias'));
  if (vacFund && vacFund.balance >= 1000 && [12, 1, 6, 7].includes(nowDate.getMonth() + 1)) {
    alerts.push({ type: 'vacation', icon: '🏖️', title: 'Fundo de Férias disponível!', message: `Você tem ${fmtBRL(vacFund.balance)} guardados. Bom momento para planejar um descanso.`, color: '#065F46', bg: '#D1FAE5' });
  }

  // ─── Computed: weekly heatmap ─────────────────────────────────────────
  const weeklyData = [1,2,3,4,5,6,0].map(dayIdx => {
    const dayRevs = transactions.filter(t => t.type === 'revenue' && new Date(t.date + 'T00:00:00').getDay() === dayIdx);
    const dayExps = transactions.filter(t => t.type === 'expense' && new Date(t.date + 'T00:00:00').getDay() === dayIdx);
    const rev = dayRevs.reduce((s, t) => s + t.gross_amount, 0);
    const units = dayRevs.reduce((s, t) => s + t.units, 0);
    const exp = dayExps.reduce((s, t) => s + t.gross_amount, 0);
    const res = funds.reduce((s, f) => {
      if (f.rule_type === 'percent') return s + (rev * f.rule_value / 100);
      if (f.rule_type === 'per_unit') return s + (units * f.rule_value);
      return dayRevs.length > 0 ? s + f.rule_value : s;
    }, 0);
    const sessions = dayRevs.length;
    const net = sessions > 0 ? (rev - exp - res) / sessions : 0; // average per session
    return { day: DAYS_PT[dayIdx], net: Math.max(0, net), sessions, totalNet: Math.max(0, rev - exp - res) };
  });
  const maxWeeklyNet = Math.max(...weeklyData.map(d => d.net), 1);
  const bestDayIdx = weeklyData.reduce((best, d, i) => d.net > weeklyData[best].net ? i : best, 0);

  // ─── Reserve calc helper ──────────────────────────────────────────────
  const calcReserves = (gross: number, units: number): ReserveCalc[] =>
    funds.map(f => {
      let amount = f.rule_type === 'percent' ? gross * f.rule_value / 100 : f.rule_type === 'per_unit' ? units * f.rule_value : f.rule_value;
      return { fundId: f.id, name: f.name, emoji: f.emoji, color: f.color, amount: +amount.toFixed(2) };
    }).filter(r => r.amount > 0);

  // ─── Onboarding ───────────────────────────────────────────────────────
  const selectProfType = (typeId: string) => {
    const cfg = PROFESSION_TYPES.find(p => p.id === typeId)!;
    setObType(typeId); setObFunds(cfg.defaultFunds.map(f => ({ ...f }))); setOnboardStep(2);
  };

  const finishOnboarding = async () => {
    if (!user || !obType) return;
    const cfg = PROFESSION_TYPES.find(p => p.id === obType)!;
    setObSaving(true);
    await supabase.from('business_profiles').insert({
      user_id: user.uid, profession_type: obType, profession_label: cfg.label, unit_label: cfg.unitLabel,
      asset_name: obAsset || null, wear_rate_per_unit: 0,
      monthly_goal: obMonthlyGoal ? Number(obMonthlyGoal) : null,
      working_days: Number(obWorkingDays) || 22,
    });
    for (const f of obFunds) {
      await supabase.from('business_reserve_funds').insert({ user_id: user.uid, name: f.name, rule_type: f.rule_type, rule_value: f.rule_value, emoji: f.emoji, color: f.color });
    }
    await loadAll();
    setObSaving(false);
  };

  // ─── Express entry ────────────────────────────────────────────────────
  const previewEntry = () => { if (!entryGross) return; setEntryPreview(calcReserves(Number(entryGross), Number(entryUnits))); };

  const confirmEntry = async () => {
    if (!user || !profile || !entryGross) return;
    const gross = Number(entryGross); const units = Number(entryUnits); const expense = Number(entryExpense);
    const reserves = entryPreview ?? calcReserves(gross, units);
    setEntryLoading(true);

    const { data: revTx } = await supabase.from('business_transactions').insert({
      user_id: user.uid, type: 'revenue',
      description: units > 0 ? `Receita — ${units} ${profile.unit_label}` : 'Receita',
      gross_amount: gross, units, category: 'Receita', date: entryDate,
      nf_status: entryRequiresNF ? 'PENDENTE' : 'NAO_SE_APLICA',
    }).select().single();

    if (expense > 0) {
      await supabase.from('business_transactions').insert({ user_id: user.uid, type: 'expense', description: entryExpenseDesc || entryExpenseCat, gross_amount: expense, units: 0, category: entryExpenseCat, date: entryDate });
    }

    for (const r of reserves) {
      const fund = funds.find(f => f.id === r.fundId);
      if (fund) {
        await supabase.from('business_reserve_funds').update({ balance: fund.balance + r.amount }).eq('id', r.fundId);
        if (revTx) await supabase.from('business_reserve_movements').insert({ fund_id: r.fundId, transaction_id: revTx.id, amount: r.amount, description: `Reserva — ${r.name}` });
      }
    }

    setShowEntry(false); setEntryGross(''); setEntryUnits(''); setEntryExpense(''); setEntryExpenseDesc(''); setEntryPreview(null); setEntryDate(todayStr()); setEntryLoading(false); setEntryRequiresNF(true);
    setGoalReachedDismissed(false);
    await loadAll();
  };

  // ─── Pro-labore ───────────────────────────────────────────────────────
  const transferProlabore = async () => {
    if (!user || !prolaboreAmount || !prolaboreAccount) return;
    const amount = Number(prolaboreAmount);
    if (amount <= 0 || amount > available) return;
    setProlaboreLoading(true);

    await supabase.from('business_transactions').insert({ user_id: user.uid, type: 'prolabore', description: 'Pró-labore — transferência para conta pessoal', gross_amount: amount, units: 0, category: 'Pró-labore', date: todayStr() });
    const { data: acct } = await supabase.from('accounts').select('balance').eq('id', prolaboreAccount).single();
    if (acct) {
      await Promise.all([
        supabase.from('accounts').update({ balance: Number(acct.balance) + amount }).eq('id', prolaboreAccount),
        supabase.from('transactions').insert({ user_id: user.uid, account_id: prolaboreAccount, type: 'income', category: 'Pró-labore', description: `Pró-labore — ${profile?.profession_label}`, amount, date: todayStr(), is_paid: true }),
      ]);
    }

    setProlaboreLoading(false); setShowProlabore(false); setProlaboreAmount('');
    await loadAll();
  };

  // ─── Goal save ────────────────────────────────────────────────────────
  const saveGoal = async () => {
    if (!user || !profile) return;
    await supabase.from('business_profiles').update({ monthly_goal: Number(goalForm.monthly_goal) || null, working_days: Number(goalForm.working_days) || 22 }).eq('id', profile.id);
    setShowGoalModal(false);
    await loadAll();
  };

  // ─── Fund CRUD ────────────────────────────────────────────────────────
  const addFund = async () => {
    if (!user || !fundForm.name || !fundForm.rule_value) return;
    await supabase.from('business_reserve_funds').insert({ user_id: user.uid, name: fundForm.name, rule_type: fundForm.rule_type, rule_value: Number(fundForm.rule_value), emoji: fundForm.emoji, color: fundForm.color, balance: 0 });
    setShowFundModal(false); setFundForm({ name: '', rule_type: 'percent', rule_value: '', emoji: '🏦', color: '#059669' });
    await loadAll();
  };

  const updateNFStatus = async (id: string, status: 'PENDENTE' | 'EMITIDA') => {
    await supabase.from('business_transactions').update({ nf_status: status }).eq('id', id);
    setTransactions(ts => ts.map(t => t.id === id ? { ...t, nf_status: status } : t));
  };

  const deleteFund = async (id: string) => {
    if (!confirm('Excluir este fundo?')) return;
    await supabase.from('business_reserve_funds').delete().eq('id', id);
    await loadAll();
  };

  const resetProfile = async () => {
    if (!user || !confirm('Redefinir perfil? Todos os dados do módulo serão excluídos.')) return;
    await supabase.from('business_reserve_funds').delete().eq('user_id', user.uid);
    await supabase.from('business_transactions').delete().eq('user_id', user.uid);
    await supabase.from('business_profiles').delete().eq('user_id', user.uid);
    setProfile(null); setTransactions([]); setFunds([]);
    setOnboardStep(1); setObType(''); setObAsset(''); setObFunds([]);
  };

  const filteredTx = transactions.filter(t => {
    if (!inMonth(t.date)) return false;
    return txFilter === 'all' || t.type === txFilter;
  });

  const entryGrossNum = Number(entryGross);
  const entryExpenseNum = Number(entryExpense);
  const entryReserveTotal = (entryPreview ?? []).reduce((s, r) => s + r.amount, 0);
  const entryNet = entryGrossNum - entryExpenseNum - entryReserveTotal;

  if (loading) return <p style={{ color: '#9090B0', textAlign: 'center', padding: 64 }}>Carregando...</p>;

  // ─── ONBOARDING ───────────────────────────────────────────────────────
  if (!profile) return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg,#7C5CFC,#6D28D9)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(124,92,252,0.3)' }}><Briefcase size={28} color="white" /></div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0D0D1A', margin: '0 0 8px', letterSpacing: '-0.025em' }}>Módulo Autônomo / PJ</h1>
        <p style={{ fontSize: 14, color: '#9090B0' }}>Separe as finanças do seu negócio das suas finanças pessoais</p>
      </div>

      {onboardStep === 1 && (
        <>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 16 }}>Qual é a sua área de atuação?</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {PROFESSION_TYPES.map(p => (
              <button key={p.id} onClick={() => selectProfType(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderRadius: 14, border: '2px solid #E8E4FF', background: 'white', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#7C5CFC'; (e.currentTarget as HTMLButtonElement).style.background = '#F5F3FF'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E8E4FF'; (e.currentTarget as HTMLButtonElement).style.background = 'white'; }}>
                <span style={{ fontSize: 28 }}>{p.icon}</span>
                <div><div style={{ fontSize: 13, fontWeight: 700, color: '#0D0D1A' }}>{p.label}</div><div style={{ fontSize: 11, color: '#9090B0', marginTop: 2 }}>Unidade: {p.unitLabel}</div></div>
              </button>
            ))}
          </div>
        </>
      )}

      {onboardStep === 2 && (() => {
        const cfg = PROFESSION_TYPES.find(p => p.id === obType)!;
        return (
          <>
            <button onClick={() => setOnboardStep(1)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B6B9A', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20 }}><ChevronLeft size={15} /> Voltar</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: '14px 18px', background: '#F5F3FF', borderRadius: 12 }}>
              <span style={{ fontSize: 32 }}>{cfg.icon}</span>
              <div><div style={{ fontSize: 15, fontWeight: 700, color: '#0D0D1A' }}>{cfg.label}</div><div style={{ fontSize: 12, color: '#9090B0' }}>Unidade: <strong>{cfg.unitLabel}</strong></div></div>
            </div>

            <div style={{ marginBottom: 14 }}><label style={lbl}>Ativo principal (opcional)</label><input style={inp} placeholder={cfg.assetPlaceholder} value={obAsset} onChange={e => setObAsset(e.target.value)} autoFocus /></div>

            {/* Meta diária */}
            <div style={{ background: '#F5F3FF', borderRadius: 12, padding: '16px', marginBottom: 16, border: '1px solid #E8E4FF' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#7C5CFC', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Target size={14} /> Meta diária (o Anel de Progresso)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={lbl}>Quero tirar por mês (R$)</label><input style={inp} type="number" placeholder="Ex: 4000" value={obMonthlyGoal} onChange={e => setObMonthlyGoal(e.target.value)} /></div>
                <div><label style={lbl}>Dias úteis por mês</label><input style={inp} type="number" placeholder="22" value={obWorkingDays} onChange={e => setObWorkingDays(e.target.value)} /></div>
              </div>
              {obMonthlyGoal && obWorkingDays && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#7C5CFC', fontWeight: 700 }}>
                  ✓ Meta diária: {fmtBRL(Number(obMonthlyGoal) / Number(obWorkingDays))} líquidos por dia
                </div>
              )}
            </div>

            {/* Funds */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label style={{ ...lbl, marginBottom: 0 }}>Fundos de reserva automáticos</label>
                {obFunds.length > 0 && <span style={{ fontSize: 11, color: '#9090B0' }}>Edite os valores se necessário</span>}
              </div>
              {obFunds.length === 0 && <div style={{ padding: '14px', background: '#F9F8FF', borderRadius: 10, border: '1.5px dashed #E8E4FF', textAlign: 'center', marginBottom: 10 }}><p style={{ fontSize: 13, color: '#9090B0', margin: 0 }}>Sem fundos sugeridos — você pode adicionar depois</p></div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {obFunds.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', borderRadius: 10, padding: '12px 14px', border: '1px solid #E8E4FF' }}>
                    <span style={{ fontSize: 20 }}>{f.emoji}</span>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: '#0D0D1A' }}>{f.name}</div><div style={{ fontSize: 11, color: '#9090B0' }}>{f.rule_type === 'percent' ? `${f.rule_value}% da receita` : `R$ ${f.rule_value} por ${cfg.unitLabel.toLowerCase()}`}</div></div>
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

  // ─── DASHBOARD ────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg,#7C5CFC,#6D28D9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Briefcase size={19} color="white" /></div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0D0D1A', margin: 0 }}>Meu Negócio</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 13 }}>{profConfig?.icon}</span>
              <span style={{ fontSize: 12, color: '#9090B0' }}>{profile.profession_label}</span>
              {profile.asset_name && <span style={{ fontSize: 11, color: '#C4B5FD' }}>· {profile.asset_name}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={resetProfile} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #E8E4FF', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Redefinir perfil"><RotateCcw size={14} color="#9090B0" /></button>
          <button onClick={() => { setProlaboreAmount(''); setProlaboreAccount(personalAccounts[0]?.id ?? ''); setShowProlabore(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
            <ArrowUpRight size={15} /> Pagar-me
          </button>
          <button onClick={() => { setEntryGross(''); setEntryUnits(''); setEntryExpense(''); setEntryExpenseDesc(''); setEntryPreview(null); setEntryDate(todayStr()); setShowEntry(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#7C5CFC,#6D28D9)', fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
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
          <div style={{ fontSize: 11, color: '#9090B0', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><TrendingUp size={11} color="#059669" /> Faturamento</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>{fmtBRL(monthRevenue)}</div>
          <div style={{ fontSize: 10, color: '#9090B0', marginTop: 2 }}>{transactions.filter(t => t.type === 'revenue' && inMonth(t.date)).length} lançamentos</div>
        </div>
        <div style={{ borderRadius: 14, padding: '16px 18px', background: 'white', border: '1px solid #E8E4FF' }}>
          <div style={{ fontSize: 11, color: '#9090B0', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><TrendingDown size={11} color="#DC4F3A" /> Despesas</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#DC4F3A' }}>{fmtBRL(monthExpenses)}</div>
          <div style={{ fontSize: 10, color: '#9090B0', marginTop: 2 }}>{monthRevenue > 0 ? `${((monthExpenses / monthRevenue) * 100).toFixed(0)}% do faturamento` : '—'}</div>
        </div>
        <div style={{ borderRadius: 14, padding: '16px 18px', background: 'white', border: '1px solid #E8E4FF' }}>
          <div style={{ fontSize: 11, color: '#9090B0', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><PiggyBank size={11} color="#7C5CFC" /> Em reservas</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#7C5CFC' }}>{fmtBRL(totalReserves)}</div>
          <div style={{ fontSize: 10, color: '#9090B0', marginTop: 2 }}>{funds.length} fundo{funds.length !== 1 ? 's' : ''} · acumulado</div>
        </div>
        <div style={{ borderRadius: 14, padding: '16px 18px', background: available > 0 ? 'linear-gradient(135deg,#059669,#047857)' : 'white', border: available > 0 ? 'none' : '1px solid #E8E4FF', boxShadow: available > 0 ? '0 4px 16px rgba(5,150,105,0.25)' : 'none' }}>
          <div style={{ fontSize: 11, color: available > 0 ? 'rgba(255,255,255,0.75)' : '#9090B0', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><DollarSign size={11} /> Disponível</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: available > 0 ? 'white' : '#0D0D1A' }}>{fmtBRL(available)}</div>
          <div style={{ fontSize: 10, color: available > 0 ? 'rgba(255,255,255,0.65)' : '#9090B0', marginTop: 2 }}>Para pró-labore</div>
        </div>
      </div>

      {/* NF pending alert */}
      {(() => {
        const pending = transactions.filter(t => t.type === 'revenue' && t.nf_status === 'PENDENTE');
        if (pending.length === 0) return null;
        return (
          <div style={{ background: '#FEF3C7', borderRadius: 12, padding: '11px 16px', marginBottom: 10, display: 'flex', gap: 10, alignItems: 'center', border: '1px solid #FDE68A' }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>📄</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>
                {pending.length} nota{pending.length > 1 ? 's fiscais pendentes' : ' fiscal pendente'} de emissão
              </span>
              <span style={{ fontSize: 12, color: '#92400E', opacity: 0.75, marginLeft: 6 }}>
                Clique em "NF Pendente" na lista para marcar como emitida.
              </span>
            </div>
          </div>
        );
      })()}

      {/* Goal reached banner */}
      {goalReached && (
        <div style={{ background: 'linear-gradient(135deg,#059669,#047857)', borderRadius: 14, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 32 }}>🎉</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'white', marginBottom: 2 }}>Meta do dia batida!</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Você já garantiu {fmtBRL(todayNet)} líquidos hoje. O que fizer agora é bônus — ou descanse!</div>
          </div>
          <button onClick={() => setGoalReachedDismissed(true)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>Ok!</button>
        </div>
      )}

      {/* Alerts */}
      {alerts.map((a, i) => (
        <div key={i} style={{ background: a.bg, borderRadius: 12, padding: '12px 16px', marginBottom: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Bell size={15} color={a.color} style={{ flexShrink: 0, marginTop: 1 }} />
          <div><div style={{ fontSize: 13, fontWeight: 700, color: a.color }}>{a.icon} {a.title}</div><div style={{ fontSize: 12, color: a.color, opacity: 0.8, marginTop: 2 }}>{a.message}</div></div>
        </div>
      ))}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#F5F3FF', borderRadius: 12, padding: 4, marginBottom: 20, width: 'fit-content' }}>
        {([['inicio','Início'],['transacoes','Transações'],['reservas','Reservas'],['analises','Análises']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{ padding: '8px 14px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: activeTab === key ? 'white' : 'transparent', color: activeTab === key ? '#7C5CFC' : '#6B6B9A', boxShadow: activeTab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Início ── */}
      {activeTab === 'inicio' && (
        <div>
          {/* Daily goal ring */}
          {dailyGoal ? (
            <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', border: '1px solid #E8E4FF', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 24 }}>
              <RingProgress progress={dailyProgress} color={dailyProgress >= 1 ? '#059669' : dailyProgress >= 0.6 ? '#F59E0B' : '#7C5CFC'} bg={dailyProgress >= 1 ? '#ECFDF5' : '#F5F3FF'}>
                <span style={{ fontSize: 20, fontWeight: 900, color: dailyProgress >= 1 ? '#059669' : '#0D0D1A' }}>{Math.min(100, Math.round(dailyProgress * 100))}%</span>
                <span style={{ fontSize: 10, color: '#9090B0', marginTop: 1 }}>da meta</span>
              </RingProgress>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0D0D1A', marginBottom: 4 }}>Meta do dia: {fmtBRL(dailyGoal)}</div>
                <div style={{ fontSize: 14, color: '#059669', fontWeight: 700, marginBottom: 8 }}>{fmtBRL(todayNet)} líquidos hoje</div>
                <div style={{ height: 8, borderRadius: 99, background: '#F5F3FF', overflow: 'hidden', maxWidth: 280 }}>
                  <div style={{ height: '100%', width: `${Math.min(100, dailyProgress * 100)}%`, background: dailyProgress >= 1 ? '#059669' : dailyProgress >= 0.6 ? '#F59E0B' : '#7C5CFC', borderRadius: 99, transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontSize: 11, color: '#9090B0', marginTop: 6 }}>Falta {fmtBRL(Math.max(0, dailyGoal - todayNet))} para bater a meta · Meta mensal: {fmtBRL(profile.monthly_goal!)} em {profile.working_days} dias</div>
              </div>
              <button onClick={() => { setGoalForm({ monthly_goal: String(profile.monthly_goal ?? ''), working_days: String(profile.working_days ?? 22) }); setShowGoalModal(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4B5FD' }} title="Editar meta"><Target size={16} /></button>
            </div>
          ) : (
            <button onClick={() => { setGoalForm({ monthly_goal: '', working_days: '22' }); setShowGoalModal(true); }} style={{ width: '100%', background: '#F5F3FF', borderRadius: 14, padding: '14px 20px', border: '1.5px dashed #C4B5FD', cursor: 'pointer', fontFamily: 'inherit', color: '#7C5CFC', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, textAlign: 'left' }}>
              <Target size={16} /> Configurar meta diária — ative o Anel de Progresso
            </button>
          )}

          {/* Express entry CTA */}
          <div onClick={() => { setEntryGross(''); setEntryUnits(''); setEntryExpense(''); setEntryExpenseDesc(''); setEntryPreview(null); setEntryDate(todayStr()); setShowEntry(true); }} style={{ background: 'linear-gradient(135deg,#1A1A2E,#25253F)', borderRadius: 16, padding: '18px 22px', marginBottom: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#7C5CFC,#6D28D9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Zap size={20} color="white" /></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 800, color: 'white', marginBottom: 1 }}>⚡ Lançamento Rápido</div><div style={{ fontSize: 12, color: '#6B6B9A' }}>3 campos · reservas calculadas automaticamente</div></div>
            <ArrowRight size={16} color="#6B6B9A" />
          </div>

          {/* Recent transactions */}
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Hoje e recentes</div>
          {transactions.filter(t => inMonth(t.date)).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: 14, border: '1px solid #E8E4FF' }}>
              <p style={{ color: '#9090B0', fontSize: 14, margin: 0 }}>Nenhum lançamento em {MONTHS_FULL[aMonth]}.</p>
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E8E4FF', overflow: 'hidden' }}>
              {transactions.filter(t => inMonth(t.date)).slice(0, 6).map((t, i, arr) => {
                const isRev = t.type === 'revenue'; const isPL = t.type === 'prolabore';
                const color = isRev ? '#059669' : isPL ? '#7C5CFC' : '#DC4F3A';
                return (
                  <div key={t.id} style={{ padding: '12px 18px', borderBottom: i < arr.length - 1 ? '1px solid #F9F8FF' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isRev ? <TrendingUp size={14} color={color} /> : isPL ? <ArrowUpRight size={14} color={color} /> : <TrendingDown size={14} color={color} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0D0D1A' }}>{t.description}</div>
                        <div style={{ fontSize: 11, color: '#9090B0' }}>{t.date === today ? '🔵 Hoje' : t.date} · {t.category}{t.units > 0 ? ` · ${t.units} ${profile.unit_label}` : ''}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {isRev && t.nf_status && t.nf_status !== 'NAO_SE_APLICA' && (
                        <button onClick={() => updateNFStatus(t.id, t.nf_status === 'PENDENTE' ? 'EMITIDA' : 'PENDENTE')}
                          style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: t.nf_status === 'PENDENTE' ? '#FEF3C7' : '#ECFDF5', color: t.nf_status === 'PENDENTE' ? '#92400E' : '#065F46' }}>
                          {t.nf_status === 'PENDENTE' ? '📄 NF Pendente' : '✅ NF Emitida'}
                        </button>
                      )}
                      <span style={{ fontSize: 13, fontWeight: 700, color }}>{isRev ? '+' : '−'}{fmtBRL(t.gross_amount)}</span>
                    </div>
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
              <button key={key} onClick={() => setTxFilter(key)} style={{ padding: '6px 12px', borderRadius: 99, border: `1.5px solid ${txFilter === key ? '#7C5CFC' : '#E8E4FF'}`, background: txFilter === key ? '#EDE9FE' : 'white', color: txFilter === key ? '#7C5CFC' : '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
            ))}
          </div>
          {filteredTx.length === 0 ? <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: 14, border: '1px solid #E8E4FF' }}><p style={{ color: '#9090B0', fontSize: 14, margin: 0 }}>Nenhum lançamento.</p></div> : (
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E8E4FF', overflow: 'hidden' }}>
              {filteredTx.map((t, i) => {
                const isRev = t.type === 'revenue'; const isPL = t.type === 'prolabore';
                const color = isRev ? '#059669' : isPL ? '#7C5CFC' : '#DC4F3A';
                return (
                  <div key={t.id} style={{ padding: '13px 18px', borderBottom: i < filteredTx.length - 1 ? '1px solid #F9F8FF' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isRev ? <TrendingUp size={14} color={color} /> : isPL ? <ArrowUpRight size={14} color={color} /> : <TrendingDown size={14} color={color} />}
                      </div>
                      <div><div style={{ fontSize: 13, fontWeight: 600, color: '#0D0D1A' }}>{t.description}</div><div style={{ fontSize: 11, color: '#9090B0' }}>{t.category} · {t.date}{t.units > 0 ? ` · ${t.units} ${profile.unit_label}` : ''}</div></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {isRev && t.nf_status && t.nf_status !== 'NAO_SE_APLICA' && (
                        <button onClick={() => updateNFStatus(t.id, t.nf_status === 'PENDENTE' ? 'EMITIDA' : 'PENDENTE')}
                          style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: t.nf_status === 'PENDENTE' ? '#FEF3C7' : '#ECFDF5', color: t.nf_status === 'PENDENTE' ? '#92400E' : '#065F46' }}>
                          {t.nf_status === 'PENDENTE' ? '📄 NF Pendente' : '✅ NF Emitida'}
                        </button>
                      )}
                      <span style={{ fontSize: 13, fontWeight: 700, color }}>{isRev ? '+' : '−'}{fmtBRL(t.gross_amount)}</span>
                    </div>
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
            <span style={{ fontSize: 13, color: '#9090B0' }}>Acumulado: <strong style={{ color: '#7C5CFC' }}>{fmtBRL(totalReserves)}</strong></span>
            <button onClick={() => setShowFundModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid #E8E4FF', background: 'white', fontSize: 12, fontWeight: 600, color: '#7C5CFC', cursor: 'pointer', fontFamily: 'inherit' }}><Plus size={13} /> Novo fundo</button>
          </div>
          {funds.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: 14, border: '1.5px dashed #E8E4FF' }}>
              <p style={{ color: '#9090B0', fontSize: 14, margin: '0 0 16px' }}>Nenhum fundo configurado.</p>
              <button onClick={() => setShowFundModal(true)} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#7C5CFC', color: 'white', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Criar primeiro fundo</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {funds.map(f => {
                const ruleDesc = f.rule_type === 'percent' ? `${f.rule_value}% da receita` : f.rule_type === 'per_unit' ? `R$ ${f.rule_value}/${profile.unit_label.toLowerCase()}` : `R$ ${f.rule_value} fixo`;
                return (
                  <div key={f.id} style={{ background: 'white', borderRadius: 14, padding: '18px 20px', border: '1px solid #E8E4FF', position: 'relative' }}>
                    <button onClick={() => deleteFund(f.id)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB' }}><Trash2 size={13} /></button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <span style={{ fontSize: 26 }}>{f.emoji}</span>
                      <div><div style={{ fontSize: 14, fontWeight: 700, color: '#0D0D1A' }}>{f.name}</div><div style={{ fontSize: 11, color: '#9090B0' }}>{ruleDesc}</div></div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: f.color, marginBottom: 8 }}>{fmtBRL(f.balance)}</div>
                    <div style={{ height: 5, borderRadius: 99, background: '#F5F3FF', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${totalReserves > 0 ? Math.min(100, (f.balance / totalReserves) * 100) : 0}%`, background: f.color, borderRadius: 99 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Análises ── */}
      {activeTab === 'analises' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Runway — Fôlego financeiro */}
          <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', border: '1px solid #E8E4FF' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0D0D1A', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              🧘 Fôlego Financeiro (Runway)
            </div>
            <p style={{ fontSize: 12, color: '#9090B0', margin: '0 0 16px' }}>Com suas reservas de emergência/férias, quanto tempo consegue pagar as contas sem trabalhar?</p>
            {runwayDays !== null && dailyCost > 0 ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: '#F9F8FF', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, color: '#9090B0', marginBottom: 2 }}>Reservas de férias/emergência</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#7C5CFC' }}>{fmtBRL(emergencyBalance)}</div>
                  </div>
                  <div style={{ background: '#F9F8FF', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, color: '#9090B0', marginBottom: 2 }}>Custo mensal da casa (média)</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0D0D1A' }}>{fmtBRL(personalMonthlyExpenses)}</div>
                  </div>
                  <div style={{ background: runwayDays >= 30 ? '#ECFDF5' : runwayDays >= 14 ? '#FEF3C7' : '#FEE2E2', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, color: '#9090B0', marginBottom: 2 }}>Dias de fôlego</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: runwayDays >= 30 ? '#059669' : runwayDays >= 14 ? '#92400E' : '#DC4F3A' }}>{runwayDays} dias</div>
                  </div>
                </div>
                <div style={{ background: runwayDays >= 30 ? '#ECFDF5' : '#FEF3C7', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 18 }}>{runwayDays >= 30 ? '✅' : runwayDays >= 14 ? '⚠️' : '🚨'}</span>
                  <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.5 }}>
                    {runwayDays >= 60 ? `Excelente! Com ${fmtBRL(emergencyBalance)} guardados, você consegue pagar as contas da casa por ${runwayDays} dias sem precisar trabalhar.`
                      : runwayDays >= 30 ? `Bom! Você tem ${runwayDays} dias de segurança. Tente chegar a 60 dias para mais tranquilidade.`
                      : runwayDays >= 14 ? `Atenção: seu fôlego é de ${runwayDays} dias. Priorize aumentar suas reservas de emergência.`
                      : `Urgente: apenas ${runwayDays} dias de fôlego. Um imprevisto pode comprometer suas finanças pessoais.`}
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', background: '#F9F8FF', borderRadius: 12 }}>
                <p style={{ fontSize: 13, color: '#9090B0', margin: 0 }}>
                  {emergencyBalance === 0 ? 'Configure fundos de férias ou emergência para ver seu fôlego financeiro.' : 'Ainda não há dados suficientes de despesas pessoais para calcular o runway.'}
                </p>
              </div>
            )}
          </div>

          {/* Weekly heatmap */}
          <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', border: '1px solid #E8E4FF' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0D0D1A', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart2 size={16} color="#7C5CFC" /> Lucratividade por dia da semana
            </div>
            <p style={{ fontSize: 12, color: '#9090B0', margin: '0 0 16px' }}>Lucro líquido médio por {profile.unit_label.toLowerCase()} em cada dia — baseado em todo o histórico</p>
            {weeklyData.every(d => d.sessions === 0) ? (
              <div style={{ padding: '32px', textAlign: 'center', background: '#F9F8FF', borderRadius: 12 }}><p style={{ fontSize: 13, color: '#9090B0', margin: 0 }}>Faça pelo menos uma semana de lançamentos para ver o heatmap.</p></div>
            ) : (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {weeklyData.map((d, i) => {
                    const barPct = maxWeeklyNet > 0 ? (d.net / maxWeeklyNet) * 100 : 0;
                    const isBest = i === bestDayIdx && d.sessions > 0;
                    return (
                      <div key={d.day} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: isBest ? '#059669' : '#9090B0', width: 30, textAlign: 'right', flexShrink: 0 }}>{d.day}</span>
                        <div style={{ flex: 1, height: 28, background: '#F5F3FF', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                          <div style={{ height: '100%', width: `${barPct}%`, background: isBest ? 'linear-gradient(90deg,#059669,#047857)' : 'linear-gradient(90deg,#7C5CFC,#A78BFA)', borderRadius: 8, transition: 'width 0.5s', minWidth: d.sessions > 0 ? 4 : 0 }} />
                          {d.sessions === 0 && <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#C4C4D8' }}>sem dados</span>}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 90 }}>
                          {d.sessions > 0 ? (
                            <span style={{ fontSize: 12, fontWeight: 700, color: isBest ? '#059669' : '#374151' }}>{fmtBRL(d.net)}<span style={{ fontSize: 10, color: '#9090B0', fontWeight: 400 }}>/{profile.unit_label.toLowerCase()}</span></span>
                          ) : <span style={{ fontSize: 11, color: '#E8E4FF' }}>—</span>}
                        </div>
                        {isBest && <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '2px 6px', borderRadius: 99, flexShrink: 0 }}>🏆 melhor</span>}
                      </div>
                    );
                  })}
                </div>
                {weeklyData.some(d => d.sessions > 0) && (
                  <div style={{ marginTop: 14, padding: '10px 14px', background: '#F5F3FF', borderRadius: 10 }}>
                    <p style={{ fontSize: 12, color: '#7C5CFC', fontWeight: 600, margin: 0 }}>
                      💡 {DAYS_PT[weeklyData[bestDayIdx]?.day === DAYS_PT[weeklyData[bestDayIdx] ? bestDayIdx : 0] ? bestDayIdx : 0]}
                      {' '}são suas {weeklyData[bestDayIdx]?.sessions > 1 ? 'melhores sessões' : 'melhores'}, com {fmtBRL(weeklyData[bestDayIdx]?.net)} líquidos por {profile.unit_label.toLowerCase()} em média.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Lançamento Expresso ── */}
      {showEntry && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 24, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ background: 'linear-gradient(135deg,#1A1A2E,#25253F)', borderRadius: '24px 24px 0 0', padding: '22px 24px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Zap size={18} color="#A78BFA" /><span style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>Lançamento Rápido</span></div>
                <button onClick={() => setShowEntry(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6B9A' }}><X size={18} /></button>
              </div>
              <p style={{ fontSize: 12, color: '#6B6B9A', margin: '4px 0 0' }}>Reservas calculadas e distribuídas automaticamente</p>
            </div>
            <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ ...lbl, color: '#0D0D1A', fontSize: 13, fontWeight: 700 }}>💰 Quanto entrou?</label>
                <input style={{ ...inp, fontSize: 22, fontWeight: 800, color: '#059669', height: 54 }} type="number" placeholder="R$ 0,00" value={entryGross} onChange={e => { setEntryGross(e.target.value); setEntryPreview(null); }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={lbl}>{profConfig?.icon} Qtde de {profile.unit_label.toLowerCase()}</label><input style={inp} type="number" placeholder="0" value={entryUnits} onChange={e => { setEntryUnits(e.target.value); setEntryPreview(null); }} /></div>
                <div><label style={lbl}>Data</label><input style={inp} type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} /></div>
              </div>
              {/* NF toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#F9F8FF', borderRadius: 10, border: '1px solid #E8E4FF' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#374151', flex: 1 }}>
                  <input type="checkbox" checked={entryRequiresNF} onChange={e => setEntryRequiresNF(e.target.checked)} />
                  📄 Exige emissão de Nota Fiscal?
                </label>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: entryRequiresNF ? '#FEF3C7' : '#F5F3FF', color: entryRequiresNF ? '#92400E' : '#9090B0' }}>
                  {entryRequiresNF ? 'NF Pendente' : 'Não se aplica'}
                </span>
              </div>

              <div>
                <label style={lbl}>💸 Gasto imediato? (opcional)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: entryExpense ? 8 : 0 }}>
                  <input style={inp} type="number" placeholder="R$ 0,00" value={entryExpense} onChange={e => { setEntryExpense(e.target.value); setEntryPreview(null); }} />
                  <select style={inp} value={entryExpenseCat} onChange={e => setEntryExpenseCat(e.target.value)}>
                    {(profConfig?.expenseCategories ?? ['Outros']).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                {entryExpense && <input style={inp} placeholder="Descrição do gasto (opcional)" value={entryExpenseDesc} onChange={e => setEntryExpenseDesc(e.target.value)} />}
              </div>

              {!entryPreview && entryGross && funds.length > 0 && (
                <button onClick={previewEntry} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '2px dashed #7C5CFC', background: '#F5F3FF', color: '#7C5CFC', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Ver cálculo automático das reservas →
                </button>
              )}

              {(entryPreview || funds.length === 0) && entryGrossNum > 0 && (
                <div style={{ background: '#1A1A2E', borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#A78BFA', marginBottom: 10 }}>📊 CÁLCULO AUTOMÁTICO</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: '#6B6B9A' }}>Receita bruta</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>+{fmtBRL(entryGrossNum)}</span>
                  </div>
                  {entryExpenseNum > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}><span style={{ fontSize: 13, color: '#6B6B9A' }}>{entryExpenseCat}</span><span style={{ fontSize: 13, fontWeight: 700, color: '#DC4F3A' }}>−{fmtBRL(entryExpenseNum)}</span></div>}
                  {(entryPreview ?? []).length > 0 && <>
                    <div style={{ fontSize: 10, color: '#3D3D5C', margin: '8px 0 5px', fontWeight: 700 }}>Reservas automáticas:</div>
                    {(entryPreview ?? []).map(r => <div key={r.fundId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><span style={{ fontSize: 12, color: '#6B6B9A' }}>{r.emoji} {r.name}</span><span style={{ fontSize: 12, fontWeight: 700, color: r.color }}>−{fmtBRL(r.amount)}</span></div>)}
                  </>}
                  <div style={{ borderTop: '1px solid #25253F', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>💚 Disponível hoje</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: entryNet > 0 ? '#059669' : '#DC4F3A' }}>{fmtBRL(Math.max(0, entryNet))}</span>
                  </div>
                </div>
              )}

              <button onClick={confirmEntry} disabled={entryLoading || !entryGross} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: entryGross ? 'linear-gradient(135deg,#7C5CFC,#6D28D9)' : '#E8E4FF', color: entryGross ? 'white' : '#9090B0', fontWeight: 700, fontSize: 15, cursor: entryGross ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                {entryLoading ? 'Salvando...' : entryPreview ? 'Confirmar e Salvar' : 'Salvar Lançamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Pagar-me ── */}
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
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={lbl}>Quanto quer transferir?</label><input style={{ ...inp, fontSize: 18, fontWeight: 800 }} type="number" placeholder={`Máx. ${fmtBRL(available)}`} value={prolaboreAmount} onChange={e => setProlaboreAmount(e.target.value)} autoFocus max={available} />{Number(prolaboreAmount) > available && <p style={{ fontSize: 12, color: '#DC4F3A', margin: '4px 0 0', fontWeight: 600 }}>Maior que o disponível</p>}</div>
              <div><label style={lbl}>Para qual conta pessoal?</label><select style={inp} value={prolaboreAccount} onChange={e => setProlaboreAccount(e.target.value)}><option value="">Selecione...</option>{personalAccounts.map(a => <option key={a.id} value={a.id}>{a.name} · {fmtBRL(Number(a.balance))}</option>)}</select></div>
            </div>
            <button onClick={transferProlabore} disabled={prolaboreLoading || !prolaboreAmount || !prolaboreAccount || Number(prolaboreAmount) > available || Number(prolaboreAmount) <= 0} style={{ width: '100%', marginTop: 20, padding: '14px', borderRadius: 12, border: 'none', background: (prolaboreAmount && prolaboreAccount && Number(prolaboreAmount) <= available && Number(prolaboreAmount) > 0) ? 'linear-gradient(135deg,#059669,#047857)' : '#E8E4FF', color: (prolaboreAmount && prolaboreAccount) ? 'white' : '#9090B0', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {prolaboreLoading ? 'Transferindo...' : <><Check size={16} /> Transferir para conta pessoal</>}
            </button>
            <p style={{ textAlign: 'center', fontSize: 11, color: '#9090B0', margin: '10px 0 0' }}>Aparecerá como receita "Pró-labore" nas suas finanças pessoais</p>
          </div>
        </div>
      )}

      {/* ── Modal: Meta diária ── */}
      {showGoalModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Target size={18} color="#7C5CFC" /> Meta mensal</h3>
              <button onClick={() => setShowGoalModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9090B0' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 13, color: '#9090B0', marginBottom: 16 }}>Define o Anel de Progresso Diário — o sistema divide a meta pelo número de dias úteis.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={lbl}>Meta de pró-labore mensal (R$)</label><input style={{ ...inp, fontSize: 18, fontWeight: 800 }} type="number" placeholder="Ex: 4000" value={goalForm.monthly_goal} onChange={e => setGoalForm(f => ({ ...f, monthly_goal: e.target.value }))} autoFocus /></div>
              <div><label style={lbl}>Dias úteis por mês</label><input style={inp} type="number" placeholder="22" value={goalForm.working_days} onChange={e => setGoalForm(f => ({ ...f, working_days: e.target.value }))} /></div>
              {goalForm.monthly_goal && goalForm.working_days && <div style={{ background: '#EDE9FE', borderRadius: 10, padding: '10px 14px' }}><span style={{ fontSize: 13, fontWeight: 700, color: '#7C5CFC' }}>Meta diária: {fmtBRL(Number(goalForm.monthly_goal) / Number(goalForm.working_days))} líquidos</span></div>}
            </div>
            <button onClick={saveGoal} style={{ width: '100%', marginTop: 18, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#7C5CFC,#6D28D9)', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>Salvar meta</button>
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
              <div><label style={lbl}>Tipo de regra</label>
                <select style={inp} value={fundForm.rule_type} onChange={e => setFundForm(f => ({ ...f, rule_type: e.target.value as 'percent' | 'per_unit' | 'fixed' }))}>
                  <option value="percent">% da receita bruta</option>
                  <option value="per_unit">R$ por {profile.unit_label.toLowerCase()}</option>
                  <option value="fixed">Valor fixo por lançamento</option>
                </select>
              </div>
              <div><label style={lbl}>Valor *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input style={{ ...inp, flex: 1 }} type="number" step="0.01" placeholder="0" value={fundForm.rule_value} onChange={e => setFundForm(f => ({ ...f, rule_value: e.target.value }))} />
                  <span style={{ fontSize: 13, color: '#9090B0', whiteSpace: 'nowrap' }}>{fundForm.rule_type === 'percent' ? '%' : `R$/${profile.unit_label.toLowerCase()}`}</span>
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
