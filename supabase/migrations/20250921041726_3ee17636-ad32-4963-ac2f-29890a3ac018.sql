-- Fix the purge_expired_trial_firm function by removing reference to non-existent pricing_config table
CREATE OR REPLACE FUNCTION public.purge_expired_trial_firm(p_firm_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only purge if firm is trial-only and past grace
  IF EXISTS (
    SELECT 1 FROM public.firm_subscriptions
    WHERE firm_id = p_firm_id
      AND subscribed_once = FALSE
      AND grace_until < now()
  ) THEN
    -- Delete children first
    DELETE FROM public.event_assignment_rates WHERE firm_id = p_firm_id;
    DELETE FROM public.event_staff_assignments WHERE firm_id = p_firm_id;
    DELETE FROM public.staff_payments WHERE firm_id = p_firm_id;
    DELETE FROM public.freelancer_payments WHERE firm_id = p_firm_id;
    DELETE FROM public.accounting_entries WHERE firm_id = p_firm_id;
    DELETE FROM public.expenses WHERE firm_id = p_firm_id;
    DELETE FROM public.tasks WHERE firm_id = p_firm_id;
    DELETE FROM public.payments WHERE firm_id = p_firm_id;
    DELETE FROM public.quotations WHERE firm_id = p_firm_id;
    -- Removed pricing_config reference as table doesn't exist
    DELETE FROM public.event_closing_balances WHERE firm_id = p_firm_id;
    DELETE FROM public.freelancers WHERE firm_id = p_firm_id;
    DELETE FROM public.clients WHERE firm_id = p_firm_id;
    DELETE FROM public.wa_sessions WHERE firm_id = p_firm_id;
    DELETE FROM public.events WHERE firm_id = p_firm_id;
    DELETE FROM public.firm_payments WHERE firm_id = p_firm_id;
    DELETE FROM public.firm_members WHERE firm_id = p_firm_id;
    DELETE FROM public.firm_subscriptions WHERE firm_id = p_firm_id;

    -- Delete firm last
    DELETE FROM public.firms WHERE id = p_firm_id;
  END IF;
END;
$function$;