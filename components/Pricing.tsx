import React, { useState } from 'react';
import { Check, Zap, Users, Sparkles, Tag, ArrowRight, Shield, Clock } from 'lucide-react';
import { PLANS, PlanId } from '../config/plans';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';

const PricingPage: React.FC = () => {
  const { user } = useAuth();
  const { plan: currentPlan } = usePlan();
  const [couponCode, setCouponCode] = useState('');
  const [couponStatus, setCouponStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
  const [couponData, setCouponData] = useState<any>(null);
  const [applyingPlan, setApplyingPlan] = useState<PlanId | null>(null);
  const [hoveredPlan, setHoveredPlan] = useState<PlanId | null>(null);

  const planConfig = {
    free: {
      icon: <Sparkles size={22} />,
      gradient: 'none',
      iconBg: '#F3F4F6',
      iconColor: '#6B7280',
    },
    pro: {
      icon: <Zap size={22} />,
      gradient: 'linear-gradient(135deg, #7C5CFC 0%, #5B21B6 100%)',
      iconBg: 'rgba(255,255,255,0.2)',
      iconColor: 'white',
    },
    family: {
      icon: <Users size={22} />,
      gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      iconBg: 'rgba(255,255,255,0.2)',
      iconColor: 'white',
    },
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponStatus('loading');
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', couponCode.trim().toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !data || (data.expires_at && new Date(data.expires_at) < new Date()) || (data.max_uses && data.uses_count >= data.max_uses)) {
      setCouponStatus('invalid');
      setCouponData(null);
      return;
    }
    setCouponStatus('valid');
    setCouponData(data);
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
    if (plan.price === 0) return null;
    if (couponData?.type === 'discount' && couponData.discount_percent) {
      return (plan.price * (1 - couponData.discount_percent / 100)).toFixed(2).replace('.', ',');
    }
    return null;
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 64 }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#EDE9FE', borderRadius: 99, padding: '6px 14px', marginBottom: 16,
        }}>
          <Zap size={13} color="#7C5CFC" />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#7C5CFC', letterSpacing: '0.05em' }}>
            PLANOS E PREÇOS
          </span>
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 900, color: '#0F0F1A', letterSpacing: '-0.025em', marginBottom: 12 }}>
          Simples, transparente,<br />
          <span style={{ color: '#7C5CFC' }}>sem surpresas</span>
        </h1>
        <p style={{ fontSize: 16, color: '#6B6B9A', maxWidth: 420, margin: '0 auto' }}>
          Comece grátis. Faça upgrade quando o seu dinheiro pedir mais controle.
        </p>
      </div>

      {/* Cupom */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'white', borderRadius: 16, padding: '10px 10px 10px 16px',
          border: couponStatus === 'valid' ? '1.5px solid #059669' : couponStatus === 'invalid' ? '1.5px solid #DC4F3A' : '1.5px solid #E8E4FF',
          boxShadow: '0 4px 20px rgba(124,92,252,0.08)',
          maxWidth: 440, width: '100%', transition: 'border-color 0.2s',
        }}>
          <Tag size={15} color={couponStatus === 'valid' ? '#059669' : '#7C5CFC'} style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Tem um cupom de desconto?"
            value={couponCode}
            onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponStatus('idle'); }}
            onKeyDown={e => e.key === 'Enter' && validateCoupon()}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 14, color: '#1A1A2E', fontFamily: 'inherit',
            }}
          />
          <button
            onClick={couponStatus === 'valid' ? applyCoupon : validateCoupon}
            disabled={couponStatus === 'loading' || applyingPlan !== null}
            style={{
              background: couponStatus === 'valid' ? '#059669' : '#7C5CFC',
              color: 'white', border: 'none', borderRadius: 10,
              padding: '8px 16px', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
              transition: 'background 0.2s',
            }}
          >
            {couponStatus === 'loading' ? '...' : couponStatus === 'valid' ? 'Ativar' : 'Aplicar'}
          </button>
        </div>
      </div>

      {/* Feedback cupom */}
      {couponStatus === 'valid' && couponData && (
        <p style={{ textAlign: 'center', marginTop: -28, marginBottom: 28, fontSize: 13, color: '#059669', fontWeight: 600 }}>
          Cupom ativo: {couponData.type === 'free_access'
            ? `${couponData.free_days} dias grátis de ${PLANS[couponData.plan as PlanId]?.name}`
            : `${couponData.discount_percent}% de desconto aplicado`}
        </p>
      )}
      {couponStatus === 'invalid' && (
        <p style={{ textAlign: 'center', marginTop: -28, marginBottom: 28, fontSize: 13, color: '#DC4F3A', fontWeight: 600 }}>
          Cupom inválido ou expirado
        </p>
      )}

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {(Object.keys(PLANS) as PlanId[]).map((planId) => {
          const plan = PLANS[planId];
          const config = planConfig[planId];
          const isCurrent = currentPlan === planId;
          const isPro = planId === 'pro';
          const isHovered = hoveredPlan === planId;
          const discountedPrice = getDiscountedPrice(planId);
          const hasCouponForThis = couponStatus === 'valid' && couponData?.plan === planId && couponData.type === 'free_access';
          const isDark = planId !== 'free';

          return (
            <div
              key={planId}
              onMouseEnter={() => setHoveredPlan(planId)}
              onMouseLeave={() => setHoveredPlan(null)}
              style={{
                borderRadius: 24,
                overflow: 'hidden',
                position: 'relative',
                boxShadow: isHovered || isPro
                  ? '0 20px 60px rgba(124,92,252,0.18)'
                  : '0 4px 20px rgba(0,0,0,0.06)',
                transform: isPro ? 'scale(1.03)' : isHovered ? 'scale(1.01)' : 'scale(1)',
                transition: 'all 0.25s ease',
                border: isPro ? '2px solid #7C5CFC' : '1px solid #E8E4FF',
              }}
            >
              {/* Card header com gradient */}
              <div style={{
                background: config.gradient,
                padding: isPro ? '28px 28px 24px' : '24px 28px 20px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {isPro && (
                  <div style={{
                    position: 'absolute', top: 16, right: 16,
                    background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)',
                    borderRadius: 99, padding: '4px 10px',
                    fontSize: 10, fontWeight: 800, color: 'white', letterSpacing: '0.08em',
                  }}>
                    MAIS POPULAR
                  </div>
                )}

                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: config.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isDark ? 'white' : '#6B7280',
                  marginBottom: 16,
                  border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #E5E7EB',
                }}>
                  {config.icon}
                </div>

                <h3 style={{
                  fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em',
                  color: isDark ? 'white' : '#0F0F1A', marginBottom: 4,
                }}>
                  {plan.name}
                </h3>
                <p style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.7)' : '#6B6B9A' }}>
                  {plan.description}
                </p>

                {/* Preço */}
                <div style={{ marginTop: 20 }}>
                  {plan.price === 0 ? (
                    <div style={{ fontSize: 38, fontWeight: 900, color: '#0F0F1A', letterSpacing: '-0.03em' }}>
                      Grátis
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                      <div>
                        {discountedPrice ? (
                          <>
                            <div style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.5)' : '#9CA3AF', textDecoration: 'line-through' }}>
                              {plan.priceLabel}
                            </div>
                            <div style={{ fontSize: 38, fontWeight: 900, color: isDark ? 'white' : '#0F0F1A', letterSpacing: '-0.03em', lineHeight: 1 }}>
                              R${discountedPrice}
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize: 38, fontWeight: 900, color: isDark ? 'white' : '#0F0F1A', letterSpacing: '-0.03em', lineHeight: 1 }}>
                            {plan.priceLabel}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 14, color: isDark ? 'rgba(255,255,255,0.6)' : '#9CA3AF', paddingBottom: 6 }}>
                        /mês
                      </div>
                    </div>
                  )}
                  {'trialDays' in plan && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8,
                      background: isDark ? 'rgba(255,255,255,0.15)' : '#EDE9FE',
                      borderRadius: 99, padding: '3px 10px',
                    }}>
                      <Clock size={11} color={isDark ? 'white' : '#7C5CFC'} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? 'white' : '#7C5CFC' }}>
                        {plan.trialDays} dias grátis
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card body */}
              <div style={{ background: 'white', padding: '20px 28px 24px' }}>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {plan.features.map((feature) => (
                    <li key={feature} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 99, flexShrink: 0,
                        background: planId === 'free' ? '#F3F4F6' : planId === 'pro' ? '#EDE9FE' : '#D1FAE5',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Check size={11} color={planId === 'free' ? '#6B7280' : planId === 'pro' ? '#7C5CFC' : '#059669'} strokeWidth={3} />
                      </div>
                      <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{feature}</span>
                    </li>
                  ))}
                  {plan.locked.map((feature) => (
                    <li key={feature} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.35 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 99, flexShrink: 0, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 8, height: 1.5, background: '#9CA3AF', borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 13, color: '#9CA3AF' }}>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Botão */}
                {isCurrent ? (
                  <div style={{
                    textAlign: 'center', padding: '12px', borderRadius: 14,
                    background: '#F9FAFB', color: '#9CA3AF',
                    fontSize: 14, fontWeight: 600, border: '1.5px solid #E5E7EB',
                  }}>
                    Plano atual
                  </div>
                ) : hasCouponForThis ? (
                  <button
                    onClick={applyCoupon}
                    disabled={applyingPlan !== null}
                    style={{
                      width: '100%', padding: '13px', borderRadius: 14, border: 'none',
                      background: 'linear-gradient(135deg, #059669, #047857)',
                      color: 'white', fontSize: 14, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    {applyingPlan === planId ? 'Ativando...' : `Ativar ${plan.name} grátis`}
                    {applyingPlan !== planId && <ArrowRight size={15} />}
                  </button>
                ) : planId !== 'free' ? (
                  <button
                    style={{
                      width: '100%', padding: '13px', borderRadius: 14, border: 'none',
                      background: isPro
                        ? 'linear-gradient(135deg, #7C5CFC, #5B21B6)'
                        : 'linear-gradient(135deg, #059669, #047857)',
                      color: 'white', fontSize: 14, fontWeight: 700,
                      cursor: 'not-allowed', fontFamily: 'inherit', opacity: 0.55,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                    title="Em breve — integração com Mercado Pago"
                  >
                    Assinar {plan.name}
                    <ArrowRight size={15} />
                  </button>
                ) : (
                  <div style={{
                    textAlign: 'center', padding: '12px', borderRadius: 14,
                    background: '#F9FAFB', color: '#9CA3AF',
                    fontSize: 14, fontWeight: 600, border: '1.5px solid #E5E7EB',
                  }}>
                    Fazer downgrade
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rodapé */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 40, flexWrap: 'wrap' }}>
        {[
          { icon: <Shield size={14} />, text: 'Pagamento seguro' },
          { icon: <Clock size={14} />, text: 'Cancele quando quiser' },
          { icon: <Check size={14} />, text: 'Sem fidelidade ou multa' },
        ].map(({ icon, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9CA3AF', fontSize: 13 }}>
            {icon}
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PricingPage;
