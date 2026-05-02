import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { PLANS, PlanId, planHasAccess } from '../config/plans';

interface PlanState {
  plan: PlanId;
  planExpiresAt: string | null;
  loading: boolean;
  isPro: boolean;
  isFamily: boolean;
  isFree: boolean;
  canAddTransaction: (currentMonthCount: number) => boolean;
  canAddAccount: (currentCount: number) => boolean;
  canAddGoal: (currentCount: number) => boolean;
  hasAccess: (requiredPlan: PlanId) => boolean;
  limits: typeof PLANS['free']['limits'];
}

export function usePlan(): PlanState {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanId>('free');
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPlan('free');
      setLoading(false);
      return;
    }

    // Busca o plano atual do usuário
    const fetchPlan = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('plan, plan_expires_at')
        .eq('id', user.uid)
        .single();

      if (data) {
        // Verifica se o plano não expirou
        const isExpired = data.plan_expires_at
          ? new Date(data.plan_expires_at) < new Date()
          : false;

        setPlan(isExpired ? 'free' : (data.plan as PlanId) ?? 'free');
        setPlanExpiresAt(data.plan_expires_at);

        // Se expirou, rebaixa para free automaticamente
        if (isExpired && data.plan !== 'free') {
          await supabase
            .from('profiles')
            .update({ plan: 'free', plan_expires_at: null })
            .eq('id', user.uid);
        }
      }
      setLoading(false);
    };

    fetchPlan();

    // Escuta mudanças em tempo real (ex: webhook atualizou o plano)
    const channel = supabase
      .channel('profile-plan')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.uid}`,
      }, (payload) => {
        const newPlan = payload.new.plan as PlanId;
        setPlan(newPlan ?? 'free');
        setPlanExpiresAt(payload.new.plan_expires_at);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const limits = PLANS[plan].limits;

  return {
    plan,
    planExpiresAt,
    loading,
    isPro: planHasAccess(plan, 'pro'),
    isFamily: planHasAccess(plan, 'family'),
    isFree: plan === 'free',
    hasAccess: (requiredPlan: PlanId) => planHasAccess(plan, requiredPlan),
    canAddTransaction: (currentMonthCount: number) => {
      const limit = limits.transactionsPerMonth;
      return limit === Infinity || currentMonthCount < limit;
    },
    canAddAccount: (currentCount: number) => {
      const limit = limits.accounts;
      return limit === Infinity || currentCount < limit;
    },
    canAddGoal: (currentCount: number) => {
      const limit = limits.goals;
      return limit === Infinity || currentCount < limit;
    },
    limits,
  };
}
