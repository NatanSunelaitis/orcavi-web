import React, { useState } from 'react';
import { Check, Zap, Users, Sparkles, Tag, ArrowRight, Shield, Clock } from 'lucide-react';
import { PLANS, PlanId } from '../config/plans';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';

const API_URL = import.meta.env.VITE_API_URL ?? 'https://orcavi-api.vercel.app';

const PricingPage: React.FC = () => {
  const { user } = useAuth();
  const { plan: currentPlan } = usePlan();
  const [couponCode, setCouponCode] = useState('');
  const [couponStatus, setCouponStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
  const [couponData, setCouponData] = useState<any>(null);
  const [applyingPlan, setApplyingPlan] = useState<PlanId | null>(null);
  const [subscribingPlan, setSubscribingPlan] = useState<PlanId | null>(null);
  const [hoveredPlan, setHoveredPlan] = useState<PlanId | null>(null);

  const handleSubscribe = async (planId: PlanId) => {
    if (!user) return;
    setSubscribingPlan(planId);
    try {
      // Tenta getSession primeiro, depois refreshSession se necessário
      let { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const refreshed = await supabase.auth.refreshSession();
        session = refreshed.data.session;
      }

      const token = session?.access_token;
      console.log('Token preview:', token?.substring(0, 30));

      if (!token) {
        alert('Sessão expirada. Faça login novamente.');
        return;
      }

      const response = await fetch(`${API_URL}/api/subscriptions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: planId }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error('API error:', JSON.stringify(errData));
        throw new Error(errData?.error ?? 'Erro ao criar assinatura');
      }

      const { init_point } = await response.json() as { init_point: string };
      window.location.href = init_point;
    } catch (err) {
      console.error(err);
      alert('Erro ao iniciar pagamento. Tente novamente.');
    } finally {
      setSubscribingPlan(null);
    }
  };

  const planConfig = {
    free:   { icon: <Sparkles size={18} />, gradient: 'none', isDark: false },
    pro:    { icon: <Zap size={18} />, gradient: 'linear-gradient(135deg, #7C5CFC 0%, #5B21B6 100%)', isDark: true },
    family: { icon: <Users size={18} />, gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)', isDark: true },
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponStatus('loading');
    const { data, error } = await supabase
      .from('promo_codes').select('*')
      .eq('code', couponCode.trim().toUpperCase()).eq('is_active', true).single();
    if (error || !data || (data.expires_at && new Date(data.expires_at) < new Date()) || (data.max_uses && data.uses_count >= data.max_uses)) {
      setCouponStatus('invalid'); setCouponData(null); return;
    }
    setCouponStatus('valid'); setCouponData(data);
  };

  const applyCoupon = async () => {
    if (!couponData || !user) return;
    setApplyingPlan(couponData.plan);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (couponData.free_days ?? 30));
    await supabase.from('profiles').update({ plan: couponData.plan, plan_expires_at: expiresAt.toISOString() }).eq('id', user.uid);
    await supabase.from('promo_codes').update({ uses_count: couponData.uses_count + 1 }).eq('id', couponData.id);
    setApplyingPlan(null);
    window.location.reload();
  };

  const getDiscountedPrice = (planId: PlanId) => {
    const plan = PLANS[planId];
    if (plan.price === 0 || !couponData?.discount_percent) return null;
    return (plan.price * (1 - couponData.discount_percent / 100)).toFixed(2).replace('.', ',');
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>

      {/* Header compacto */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Zap size={13} color="#7C5CFC" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#7C5CFC', letterSpacing: '0.06em' }}>PLANOS E PREÇOS</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0F0F1A', letterSpacing: '-0.025em', margin: 0 }}>
            Simples, transparente, <span style={{ color: '#7C5CFC' }}>sem surpresas</span>
          </h1>
          <p style={{ fontSize: 13, color: '#6B6B9A', margin: '4px 0 0' }}>
            Comece grátis. Faça upgrade quando precisar de mais controle.
          </p>
        </div>

        {/* Cupom inline no header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'white', borderRadius: 14, padding: '8px 8px 8px 14px',
          border: couponStatus === 'valid' ? '1.5px solid #059669' : couponStatus === 'invalid' ? '1.5px solid #DC4F3A' : '1.5px solid #E8E4FF',
          boxShadow: '0 2px 12px rgba(124,92,252,0.08)',
          minWidth: 280,
        }}>
          <Tag size={13} color={couponStatus === 'valid' ? '#059669' : '#7C5CFC'} style={{ flexShrink: 0 }} />
          <input
            type="text" placeholder="Tem um cupom?" value={couponCode}
            onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponStatus('idle'); }}
            onKeyDown={e => e.key === 'Enter' && validateCoupon()}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#1A1A2E', fontFamily: 'inherit' }}
          />
          {couponStatus === 'valid' && couponData && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', whiteSpace: 'nowrap', marginRight: 4 }}>
              {couponData.type === 'free_access' ? `${couponData.free_days}d grátis` : `-${couponData.discount_percent}%`}
            </span>
          )}
          <button
            onClick={couponStatus === 'valid' ? applyCoupon : validateCoupon}
            disabled={couponStatus === 'loading' || applyingPlan !== null}
            style={{
              background: couponStatus === 'valid' ? '#059669' : '#7C5CFC',
              color: 'white', border: 'none', borderRadius: 9,
              padding: '7px 14px', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >
            {couponStatus === 'loading' ? '...' : couponStatus === 'valid' ? 'Ativar' : 'Aplicar'}
          </button>
        </div>
      </div>

      {couponStatus === 'invalid' && (
        <p style={{ fontSize: 12, color: '#DC4F3A', fontWeight: 600, marginBottom: 12, marginTop: -12 }}>
          Cupom inválido ou expirado
        </p>
      )}

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {(Object.keys(PLANS) as PlanId[]).map((planId) => {
          const plan = PLANS[planId];
          const config = planConfig[planId];
          const isCurrent = currentPlan === planId;
          const isPro = planId === 'pro';
          const isHovered = hoveredPlan === planId;
          const discountedPrice = getDiscountedPrice(planId);
          const hasCouponForThis = couponStatus === 'valid' && couponData?.plan === planId && couponData.type === 'free_access';

          return (
            <div
              key={planId}
              onMouseEnter={() => setHoveredPlan(planId)}
              onMouseLeave={() => setHoveredPlan(null)}
              style={{
                borderRadius: 20, overflow: 'hidden', position: 'relative',
                boxShadow: isPro || isHovered ? '0 16px 48px rgba(124,92,252,0.15)' : '0 2px 16px rgba(0,0,0,0.06)',
                transform: isPro ? 'scale(1.02)' : isHovered ? 'translateY(-3px)' : 'none',
                transition: 'all 0.2s ease',
                border: isPro ? '2px solid #7C5CFC' : '1px solid #E8E4FF',
              }}
            >
              {/* Header colorido */}
              <div style={{
                background: config.gradient === 'none' ? '#F9FAFB' : config.gradient,
                padding: '20px 22px 16px', position: 'relative',
              }}>
                {isPro && (
                  <div style={{
                    position: 'absolute', top: 14, right: 14,
                    background: 'rgba(255,255,255,0.2)', borderRadius: 99,
                    padding: '3px 9px', fontSize: 9, fontWeight: 800,
                    color: 'white', letterSpacing: '0.08em',
                  }}>
                    MAIS POPULAR
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: config.isDark ? 'rgba(255,255,255,0.2)' : '#EDEDF0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: config.isDark ? 'white' : '#6B7280',
                    border: config.isDark ? '1px solid rgba(255,255,255,0.15)' : 'none',
                  }}>
                    {config.icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: config.isDark ? 'white' : '#0F0F1A', margin: 0, letterSpacing: '-0.02em' }}>
                      {plan.name}
                    </h3>
                    <p style={{ fontSize: 11, color: config.isDark ? 'rgba(255,255,255,0.65)' : '#9CA3AF', margin: 0 }}>
                      {plan.description}
                    </p>
                  </div>
                </div>

                {/* Preço */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                  {plan.price === 0 ? (
                    <span style={{ fontSize: 30, fontWeight: 900, color: '#0F0F1A', letterSpacing: '-0.03em', lineHeight: 1 }}>Grátis</span>
                  ) : (
                    <>
                      <div>
                        {discountedPrice && (
                          <div style={{ fontSize: 11, color: config.isDark ? 'rgba(255,255,255,0.45)' : '#9CA3AF', textDecoration: 'line-through', lineHeight: 1, marginBottom: 2 }}>
                            {plan.priceLabel}
                          </div>
                        )}
                        <span style={{ fontSize: 30, fontWeight: 900, color: config.isDark ? 'white' : '#0F0F1A', letterSpacing: '-0.03em', lineHeight: 1 }}>
                          {discountedPrice ? `R$${discountedPrice}` : plan.priceLabel}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, color: config.isDark ? 'rgba(255,255,255,0.55)' : '#9CA3AF', paddingBottom: 4 }}>/mês</span>
                    </>
                  )}
                </div>

                {'trialDays' in plan && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8,
                    background: config.isDark ? 'rgba(255,255,255,0.15)' : '#EDE9FE',
                    borderRadius: 99, padding: '3px 9px',
                  }}>
                    <Clock size={10} color={config.isDark ? 'white' : '#7C5CFC'} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: config.isDark ? 'white' : '#7C5CFC' }}>
                      {plan.trialDays} dias grátis
                    </span>
                  </div>
                )}
              </div>

              {/* Body */}
              <div style={{ background: 'white', padding: '16px 22px 20px' }}>
                <ul style={{ listStyle: 'none', margin: '0 0 16px', padding: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {plan.features.map((feature) => (
                    <li key={feature} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 17, height: 17, borderRadius: 99, flexShrink: 0,
                        background: planId === 'pro' ? '#EDE9FE' : planId === 'family' ? '#D1FAE5' : '#F3F4F6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Check size={9} color={planId === 'pro' ? '#7C5CFC' : planId === 'family' ? '#059669' : '#6B7280'} strokeWidth={3} />
                      </div>
                      <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{feature}</span>
                    </li>
                  ))}
                  {plan.locked.map((feature) => (
                    <li key={feature} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.3 }}>
                      <div style={{ width: 17, height: 17, borderRadius: 99, flexShrink: 0, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 6, height: 1.5, background: '#9CA3AF', borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Botão */}
                {isCurrent ? (
                  <div style={{ textAlign: 'center', padding: '10px', borderRadius: 12, background: '#F9FAFB', color: '#9CA3AF', fontSize: 13, fontWeight: 600, border: '1.5px solid #E5E7EB' }}>
                    Plano atual
                  </div>
                ) : hasCouponForThis ? (
                  <button onClick={applyCoupon} disabled={applyingPlan !== null} style={{
                    width: '100%', padding: '11px', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, #059669, #047857)',
                    color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}>
                    {applyingPlan === planId ? 'Ativando...' : `Ativar ${plan.name} grátis`}
                    {applyingPlan !== planId && <ArrowRight size={13} />}
                  </button>
                ) : planId !== 'free' ? (
                  <button
                    onClick={() => handleSubscribe(planId)}
                    disabled={subscribingPlan !== null}
                    style={{
                      width: '100%', padding: '11px', borderRadius: 12, border: 'none',
                      background: isPro ? 'linear-gradient(135deg, #7C5CFC, #5B21B6)' : 'linear-gradient(135deg, #059669, #047857)',
                      color: 'white', fontSize: 13, fontWeight: 700,
                      cursor: subscribingPlan ? 'wait' : 'pointer',
                      fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      opacity: subscribingPlan && subscribingPlan !== planId ? 0.5 : 1,
                    }}
                  >
                    {subscribingPlan === planId ? 'Redirecionando...' : `Assinar ${plan.name}`}
                    {subscribingPlan !== planId && <ArrowRight size={13} />}
                  </button>
                ) : (
                  <div style={{ textAlign: 'center', padding: '10px', borderRadius: 12, background: '#F9FAFB', color: '#9CA3AF', fontSize: 13, fontWeight: 600, border: '1.5px solid #E5E7EB' }}>
                    Fazer downgrade
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rodapé */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 20, flexWrap: 'wrap' }}>
        {[
          { icon: <Shield size={12} />, text: 'Pagamento seguro' },
          { icon: <Clock size={12} />, text: 'Cancele quando quiser' },
          { icon: <Check size={12} />, text: 'Sem fidelidade ou multa' },
        ].map(({ icon, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#9CA3AF', fontSize: 12 }}>
            {icon}<span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PricingPage;
