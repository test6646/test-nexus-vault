import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UNIFIED_SUBSCRIPTION_FEATURES } from '@/config/subscription-features';

export interface SubscriptionPlan {
  id: string;
  plan_id: string;
  name: string;
  display_name: string;
  price: number;
  currency: string;
  duration_months: number;
  is_active: boolean;
  sort_order: number;
}

export const useSubscriptionPlans = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      setPlans(data || []);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch plans';
      setError(errorMessage);
      console.error('Error fetching subscription plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const getPlanById = (planId: string) => {
    return plans.find(plan => plan.plan_id === planId);
  };

  const getMonthlyPrice = (plan: SubscriptionPlan) => {
    return Math.round(plan.price / plan.duration_months);
  };

  const getSavingsComparedToMonthly = (plan: SubscriptionPlan, monthlyPlan: SubscriptionPlan) => {
    if (plan.duration_months === 1) return 0;
    const monthlyTotal = monthlyPlan.price * plan.duration_months;
    return monthlyTotal - plan.price;
  };

  return {
    plans,
    loading,
    error,
    fetchPlans,
    getPlanById,
    getMonthlyPrice,
    getSavingsComparedToMonthly
  };
};