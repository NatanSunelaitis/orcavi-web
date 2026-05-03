import React, { useState, useEffect } from 'react';
import { UserPlus, Plus, X, Trash2, Users } from 'lucide-react';
import PlanGate from './PlanGate';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const COLORS = ['#7C5CFC', '#2E86AB', '#E8875A', '#059669', '#DC4F3A', '#F59E0B'];
const CATEGORIES = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Serviços', 'Pet', 'Outros'];

interface Group { id: string; name: string; admin_id: string; }
interface Member { id: string; group_id: string; name: string; avatar: string; color: string; is_pet: boolean; role: string; }
interface Expense { id: string; description: string; amount: number; category: string; date: string; splits: Split[]; }
interface Split { id: string; member_id: string; percentage: number; amount: number; is_paid: boolean; }

const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E8E4FF', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#6B6B9A', marginBottom: 4, display: 'block' };

const Family: React.FC = () => {
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const [groupName, setGroupName] = useState('');
  const [memberForm, setMemberForm] = useState({ name: '', avatar: '', color: '#7C5CFC', is_pet: false });
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', category: 'Alimentação', date: new Date().toISOString().split('T')[0] });
  const [splits, setSplits] = useState<Record<string, number>>({});

  const loadData = async () => {
    if (!user) return;

    // Busca grupo onde é admin
    const { data: groupData } = await supabase
      .from('family_groups')
      .select('*')
      .eq('admin_id', user.uid)
      .single();

    if (groupData) {
      setGroup(groupData);

      const { data: membersData } = await supabase
        .from('family_members')
        .select('*')
        .eq('group_id', groupData.id)
        .order('created_at');

      const membersList = (membersData ?? []) as Member[];
      setMembers(membersList);

      const { data: expensesData } = await supabase
        .from('shared_expenses')
        .select('*, expense_splits(*)')
        .eq('group_id', groupData.id)
        .order('date', { ascending: false });

      setExpenses((expensesData ?? []).map((e: any) => ({
        ...e,
        amount: Number(e.amount),
        splits: (e.expense_splits ?? []).map((s: any) => ({
          ...s,
          percentage: Number(s.percentage),
          amount: Number(s.amount),
        })),
      })));
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  // Inicializa splits igualmente ao abrir modal de despesa
  const openExpenseModal = () => {
    const equal = members.length > 0 ? Math.floor(100 / members.length) : 0;
    const initial: Record<string, number> = {};
    members.forEach((m, i) => {
      initial[m.id] = i === 0 ? 100 - equal * (members.length - 1) : equal;
    });
    setSplits(initial);
    setShowExpenseModal(true);
  };

  const createGroup = async () => {
    if (!user || !groupName.trim()) return;
    const { data } = await supabase.from('family_groups').insert({ name: groupName, admin_id: user.uid }).select().single();
    if (data) {
      // Adiciona o próprio usuário como membro admin
      await supabase.from('family_members').insert({
        group_id: data.id, user_id: user.uid, role: 'admin',
        name: user.displayName?.split(' ')[0] ?? 'Você',
        avatar: user.displayName?.charAt(0) ?? 'V',
        color: '#7C5CFC', is_pet: false,
      });
      setShowCreateGroup(false);
      setGroupName('');
      loadData();
    }
  };

  const addMember = async () => {
    if (!group || !memberForm.name.trim()) return;
    await supabase.from('family_members').insert({
      group_id: group.id,
      name: memberForm.name,
      avatar: memberForm.is_pet ? '🐾' : memberForm.name.charAt(0).toUpperCase(),
      color: memberForm.color,
      is_pet: memberForm.is_pet,
      role: 'member',
    });
    setShowMemberModal(false);
    setMemberForm({ name: '', avatar: '', color: '#7C5CFC', is_pet: false });
    loadData();
  };

  const removeMember = async (id: string) => {
    if (!confirm('Remover membro do grupo?')) return;
    await supabase.from('family_members').delete().eq('id', id);
    loadData();
  };

  const addExpense = async () => {
    if (!group || !user || !expenseForm.description || !expenseForm.amount) return;
    const total = Number(expenseForm.amount);
    const totalPct = Object.values(splits).reduce((s, v) => s + v, 0);
    if (totalPct !== 100) { alert('A divisão deve somar 100%'); return; }

    const { data: expense } = await supabase.from('shared_expenses').insert({
      group_id: group.id, created_by: user.uid,
      description: expenseForm.description,
      amount: total,
      category: expenseForm.category,
      date: expenseForm.date,
    }).select().single();

    if (expense) {
      const splitRows = members.map(m => ({
        expense_id: expense.id,
        member_id: m.id,
        percentage: splits[m.id] ?? 0,
        amount: Math.round(total * (splits[m.id] ?? 0) / 100 * 100) / 100,
        is_paid: false,
      }));
      await supabase.from('expense_splits').insert(splitRows);
    }

    setShowExpenseModal(false);
    setExpenseForm({ description: '', amount: '', category: 'Alimentação', date: new Date().toISOString().split('T')[0] });
    loadData();
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('Excluir despesa?')) return;
    await supabase.from('shared_expenses').delete().eq('id', id);
    loadData();
  };

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  // Calcula quanto cada membro deve pagar no total
  const memberTotals = members.map(m => {
    const total = expenses.reduce((s, e) => {
      const split = e.splits.find(sp => sp.member_id === m.id);
      return s + (split?.amount ?? 0);
    }, 0);
    return { ...m, total };
  });

  if (loading) return <p style={{ color: '#9090B0', textAlign: 'center', padding: 48 }}>Carregando...</p>;

  // Sem grupo — tela de criação
  if (!group) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Users size={28} color="#7C5CFC" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0D0D1A', marginBottom: 8 }}>Crie seu grupo familiar</h2>
        <p style={{ fontSize: 14, color: '#9090B0', marginBottom: 24, textAlign: 'center', maxWidth: 360 }}>
          Controle as finanças da família juntos. Adicione membros e divida as despesas automaticamente.
        </p>
        {!showCreateGroup ? (
          <button onClick={() => setShowCreateGroup(true)} style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: '#7C5CFC', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
            Criar grupo familiar
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360 }}>
            <input style={{ ...inputStyle, flex: 1 }} placeholder="Nome do grupo (ex: Família Silva)" value={groupName} onChange={e => setGroupName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createGroup()} />
            <button onClick={createGroup} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#7C5CFC', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Criar</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0D0D1A', letterSpacing: '-0.025em', margin: 0 }}>{group.name}</h1>
          <p style={{ fontSize: 13, color: '#9090B0', margin: '4px 0 0' }}>Controle compartilhado do grupo</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowMemberModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 10, border: '1px solid #E8E4FF', background: 'white', fontSize: 13, fontWeight: 600, color: '#2E86AB', cursor: 'pointer', fontFamily: 'inherit' }}>
            <UserPlus size={14} /> Membro
          </button>
          <button onClick={openExpenseModal} disabled={members.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 10, border: 'none', background: '#7C5CFC', fontSize: 13, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
            <Plus size={14} /> Despesa
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={{ borderRadius: 14, padding: '18px 20px', color: 'white', background: 'linear-gradient(135deg,#2E86AB,#236B8A)', boxShadow: '0 4px 16px rgba(46,134,171,0.3)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>Despesas do mês</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em' }}>{fmtBRL(totalExpenses)}</div>
        </div>
        <div style={{ borderRadius: 14, padding: '18px 20px', background: 'white', border: '1px solid #E8E4FF' }}>
          <div style={{ fontSize: 11, color: '#9090B0', marginBottom: 4 }}>Lançamentos</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0D0D1A' }}>{expenses.length}</div>
        </div>
        <div style={{ borderRadius: 14, padding: '18px 20px', background: 'white', border: '1px solid #E8E4FF' }}>
          <div style={{ fontSize: 11, color: '#9090B0', marginBottom: 8 }}>Membros</div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {members.map((m, i) => (
              <div key={m.id} style={{ width: 30, height: 30, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: m.is_pet ? 16 : 12, marginLeft: i > 0 ? -8 : 0, zIndex: members.length - i, position: 'relative', border: '2px solid white' }}>
                {m.avatar}
              </div>
            ))}
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0D0D1A', marginLeft: 10 }}>{members.length}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Membros */}
        <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid #E8E4FF' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F5F3FF', fontSize: 14, fontWeight: 700, color: '#0D0D1A' }}>Membros do Grupo</div>
          {members.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#9090B0', padding: 32, fontSize: 13 }}>Adicione membros ao grupo</p>
          ) : (
            memberTotals.map((m, i) => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: i < members.length - 1 ? '1px solid #F5F3FF' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: m.is_pet ? 18 : 14, flexShrink: 0 }}>
                    {m.avatar}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0D0D1A' }}>{m.name}</span>
                      {m.is_pet && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: '#FFE8D6', color: '#E8875A' }}>Pet</span>}
                      {m.role === 'admin' && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: '#EDE9FE', color: '#7C5CFC' }}>Admin</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: m.is_pet ? '#E8875A' : '#DC4F3A', textAlign: 'right' }}>
                    {fmtBRL(m.total)}
                  </div>
                  {m.role !== 'admin' && (
                    <button onClick={() => removeMember(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9090B0', padding: 0 }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Despesas */}
        <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid #E8E4FF' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F5F3FF', fontSize: 14, fontWeight: 700, color: '#0D0D1A' }}>Despesas Divididas</div>
          {expenses.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#9090B0', padding: 32, fontSize: 13 }}>Nenhuma despesa lançada</p>
          ) : (
            expenses.map((e, i) => (
              <div key={e.id} style={{ padding: '12px 20px', borderBottom: i < expenses.length - 1 ? '1px solid #F5F3FF' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0D0D1A' }}>{e.description}</span>
                    <span style={{ fontSize: 11, color: '#9090B0', marginLeft: 8 }}>{e.category} · {e.date}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#DC4F3A' }}>−{fmtBRL(e.amount)}</span>
                    <button onClick={() => deleteExpense(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9090B0', padding: 0 }}><Trash2 size={12} /></button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {e.splits.filter(s => s.percentage > 0).map(s => {
                    const m = members.find(mb => mb.id === s.member_id);
                    if (!m) return null;
                    return (
                      <span key={s.id} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: m.color + '22', color: m.color }}>
                        {m.is_pet ? '🐾' : m.avatar} {s.percentage}%
                      </span>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal — Novo Membro */}
      {showMemberModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Novo Membro</h3>
              <button onClick={() => setShowMemberModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9090B0' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={labelStyle}>Nome *</label><input style={inputStyle} placeholder="Ex: Juliana" value={memberForm.name} onChange={e => setMemberForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div>
                <label style={labelStyle}>Cor</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {COLORS.map(c => <button key={c} onClick={() => setMemberForm(f => ({ ...f, color: c }))} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: memberForm.color === c ? '3px solid #1A1A2E' : '2px solid transparent', cursor: 'pointer' }} />)}
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#374151' }}>
                <input type="checkbox" checked={memberForm.is_pet} onChange={e => setMemberForm(f => ({ ...f, is_pet: e.target.checked }))} />
                É um pet 🐾
              </label>
            </div>
            <button onClick={addMember} style={{ width: '100%', marginTop: 20, padding: '12px', borderRadius: 12, border: 'none', background: '#7C5CFC', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
              Adicionar Membro
            </button>
          </div>
        </div>
      )}

      {/* Modal — Nova Despesa */}
      {showExpenseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Nova Despesa</h3>
              <button onClick={() => setShowExpenseModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9090B0' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={labelStyle}>Descrição *</label><input style={inputStyle} placeholder="Ex: Aluguel" value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div><label style={labelStyle}>Valor *</label><input style={inputStyle} type="number" placeholder="0,00" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div>
                <label style={labelStyle}>Categoria</label>
                <select style={inputStyle} value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Data</label><input style={inputStyle} type="date" value={expenseForm.date} onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))} /></div>

              {/* Divisão */}
              <div>
                <label style={labelStyle}>Divisão (deve somar 100%)</label>
                {members.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: m.is_pet ? 14 : 11, flexShrink: 0 }}>
                      {m.avatar}
                    </div>
                    <span style={{ fontSize: 13, flex: 1, color: '#374151' }}>{m.name}</span>
                    <input
                      type="number" min={0} max={100}
                      value={splits[m.id] ?? 0}
                      onChange={e => setSplits(s => ({ ...s, [m.id]: Number(e.target.value) }))}
                      style={{ width: 64, padding: '6px 8px', borderRadius: 8, border: '1px solid #E8E4FF', fontSize: 13, fontFamily: 'inherit', textAlign: 'center', outline: 'none' }}
                    />
                    <span style={{ fontSize: 12, color: '#9090B0' }}>%</span>
                  </div>
                ))}
                <div style={{ fontSize: 12, color: Object.values(splits).reduce((s, v) => s + v, 0) === 100 ? '#059669' : '#DC4F3A', fontWeight: 600, textAlign: 'right' }}>
                  Total: {Object.values(splits).reduce((s, v) => s + v, 0)}%
                </div>
              </div>
            </div>
            <button onClick={addExpense} style={{ width: '100%', marginTop: 20, padding: '12px', borderRadius: 12, border: 'none', background: '#7C5CFC', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
              Salvar Despesa
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const FamilyGated: React.FC = () => (
  <PlanGate requiredPlan="family"><Family /></PlanGate>
);

export default FamilyGated;
