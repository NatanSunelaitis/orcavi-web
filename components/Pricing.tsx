import React, { useState } from 'react';
import { Check, Zap, Users, Star, Tag } from 'lucide-react';
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

  const planIcons = {
    free: <Star style={{ width: 20, height: 20 }} />,
    pro: <Zap style={{ width: 20, height: 20 }} />,
    family: <Users style={{ width: 20, height: 20 }} />,
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

    if (error || !data) {
      setCouponStatus('invalid');
      setCouponData(null);
      return;
    }

    // Verifica se expirou
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setCouponStatus('invalid');
      setCouponData(null);
      return;
    }

    // Verifica limite de usos
    if (data.max_uses && data.uses_count >= data.max_uses) {
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

    await supabase
      .from('profiles')
      .update({ plan: couponData.plan, plan_expires_at: expiresAt.toISOString() })
      .eq('id', user.uid);

    // Incrementa uso do cupom
    await supabase
      .from('promo_codes')
      .update({ uses_count: couponData.uses_count + 1 })
      .eq('id', couponData.id);

    setApplyingPlan(null);
    window.location.reload();
  };

  const getPrice = (planId: PlanId) => {
    const plan = PLANS[planId];
    if (plan.price === 0) return plan.priceLabel;
    if (couponData?.type === 'discount' && couponData.discount_percent) {
      const discounted = plan.price * (1 - couponData.discount_percent / 100);
      return (
        <span>
          <span style={{ textDecoration: 'line-through', color: '#9CA3AF', fontSize: 14 }}>
            {plan.priceLabel}
          </span>
          {' '}
          <span style={{ color: '#059669' }}>
            R${discounted.toFixed(2).replace('.', ',')}
          </span>
        </span>
      );
    }
    return plan.priceLabel;
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 0 48px' }}>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1A1A2E', marginBottom: 8 }}>
          Escolha seu plano
        </h1>
        <p style={{ color: '#6B6B9A', fontSize: 15 }}>
          Comece grátis. Faça upgrade quando precisar.
        </p>
      </div>

      {/* Cupom */}
      <div className="mb-8 flex justify-center">
        <div
          className="flex items-center gap-2 p-3 rounded-xl"
          style={{ background: '#F5F3FF', border: '1px solid #E8E4FF', maxWidth: 420, width: '100%' }}
        >
          <Tag style={{ width: 16, height: 16, color: '#7C5CFC', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Tem um cupom? Digite aqui"
            value={couponCode}
            onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponStatus('idle'); }}
            onKeyDown={e => e.key === 'Enter' && validateCoupon()}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: '#1A1A2E' }}
          />
          <button
            onClick={couponStatus === 'valid' ? applyCoupon : validateCoupon}
            disabled={couponStatus === 'loading' || applyingPlan !== null}
            className="px-3 py-1.5 rounded-lg text-sm font-600 transition-colors"
            style={{
              backgroundColor: couponStatus === 'valid' ? '#059669' : '#7C5CFC',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {couponStatus === 'loading' ? '...' :
             couponStatus === 'valid' ? 'Aplicar' : 'Validar'}
          </button>
        </div>
      </div>

      {/* Feedback do cupom */}
      {couponStatus === 'valid' && couponData && (
        <div className="text-center mb-6">
          <span
            className="inline-block px-4 py-2 rounded-full text-sm font-semibold"
            style={{ backgroundColor: '#ECFDF5', color: '#059669' }}
          >
            ✓ Cupom válido —{' '}
            {couponData.type === 'free_access'
              ? `${couponData.free_days} dias grátis de ${PLANS[couponData.plan as PlanId]?.name}`
              : `${couponData.discount_percent}% de desconto`}
          </span>
        </div>
      )}
      {couponStatus === 'invalid' && (
        <div className="text-center mb-6">
          <span
            className="inline-block px-4 py-2 rounded-full text-sm font-semibold"
            style={{ backgroundColor: '#FFF5F3', color: '#DC4F3A' }}
          >
            Cupom inválido ou expirado
          </span>
        </div>
      )}

      {/* Cards de planos */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        {(Object.keys(PLANS) as PlanId[]).map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = currentPlan === planId;
          const isPro = planId === 'pro';

          return (
            <div
              key={planId}
              className="rounded-2xl p-6 flex flex-col"
              style={{
                border: isPro ? '2px solid #7C5CFC' : '1px solid #E8E4FF',
                background: isPro ? 'linear-gradient(135deg, #F5F3FF, #EDE9FE)' : 'white',
                position: 'relative',
              }}
            >
              {isPro && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: '#7C5CFC', color: 'white', whiteSpace: 'nowrap' }}
                >
                  Mais popular
                </div>
              )}

              {/* Plano header */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="flex items-center justify-center rounded-lg"
                  style={{ width: 36, height: 36, backgroundColor: plan.color + '20', color: plan.color }}
                >
                  {planIcons[planId]}
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: 16, color: '#1A1A2E' }}>{plan.name}</h3>
                  <p style={{ fontSize: 12, color: '#6B6B9A' }}>{plan.description}</p>
                </div>
              </div>

              {/* Preço */}
              <div className="my-4">
                <div style={{ fontSize: 28, fontWeight: 800, color: '#1A1A2E' }}>
                  {getPrice(planId)}
                  {plan.price > 0 && (
                    <span style={{ fontSize: 14, fontWeight: 400, color: '#6B6B9A' }}>/mês</span>
                  )}
                </div>
                {'trialDays' in plan && (
                  <p style={{ fontSize: 12, color: '#7C5CFC', marginTop: 2 }}>
                    {plan.trialDays} dias grátis para testar
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="flex flex-col gap-2 flex-1 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check style={{ width: 15, height: 15, color: plan.color, flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 13, color: '#374151' }}>{feature}</span>
                  </li>
                ))}
                {plan.locked.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 opacity-40">
                    <div style={{ width: 15, height: 15, flexShrink: 0, marginTop: 2, textAlign: 'center', fontSize: 10 }}>—</div>
                    <span style={{ fontSize: 13, color: '#6B7280' }}>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Botão */}
              {isCurrent ? (
                <div
                  className="text-center py-2.5 rounded-xl text-sm font-semibold"
                  style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
                >
                  Plano atual
                </div>
              ) : planId === 'free' ? (
                <div
                  className="text-center py-2.5 rounded-xl text-sm font-semibold"
                  style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
                >
                  Fazer downgrade
                </div>
              ) : couponStatus === 'valid' && couponData?.plan === planId && couponData.type === 'free_access' ? (
                <button
                  onClick={applyCoupon}
                  disabled={applyingPlan !== null}
                  className="py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 600,
                    width: '100%',
                  }}
                >
                  {applyingPlan === planId ? 'Ativando...' : `Ativar ${plan.name} grátis`}
                </button>
              ) : (
                <button
                  className="py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: isPro ? '#7C5CFC' : '#1A1A2E',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 600,
                    width: '100%',
                    opacity: 0.6,
                  }}
                  title="Em breve — pagamento via Mercado Pago"
                >
                  Em breve
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center mt-6" style={{ fontSize: 12, color: '#9CA3AF' }}>
        Cancele quando quiser. Sem multa ou fidelidade.
      </p>
    </div>
  );
};

export default PricingPage;
