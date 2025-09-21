-- Fix purge ordering and broaden deletions to avoid FK violations
CREATE OR REPLACE FUNCTION public.purge_expired_trial_firm(p_firm_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  firm_owner_user_id uuid;
  staff_user_id uuid;
BEGIN
  -- Only purge if firm is trial-only and past grace
  IF EXISTS (
    SELECT 1 FROM public.firm_subscriptions
    WHERE firm_id = p_firm_id
      AND subscribed_once = FALSE
      AND grace_until < now()
  ) THEN
    -- Get the firm owner's user_id to preserve their account
    SELECT created_by INTO firm_owner_user_id 
    FROM public.firms 
    WHERE id = p_firm_id;
    
    -- Delete auth.users for all non-owner staff associated with this firm
    FOR staff_user_id IN 
      SELECT user_id FROM public.profiles 
      WHERE (firm_id = p_firm_id OR current_firm_id = p_firm_id)
        AND user_id != firm_owner_user_id
    LOOP
      PERFORM auth.delete_user(staff_user_id);
    END LOOP;

    -- Detach references from various tables that store created_by/assigned_to
    UPDATE public.events 
    SET created_by = NULL 
    WHERE created_by IN (
      SELECT id FROM public.profiles 
      WHERE firm_id = p_firm_id OR current_firm_id = p_firm_id
    );
    
    UPDATE public.tasks 
    SET assigned_to = NULL, created_by = NULL
    WHERE assigned_to IN (
      SELECT id FROM public.profiles 
      WHERE firm_id = p_firm_id OR current_firm_id = p_firm_id
    ) OR created_by IN (
      SELECT id FROM public.profiles 
      WHERE firm_id = p_firm_id OR current_firm_id = p_firm_id
    );
    
    UPDATE public.staff_payments 
    SET created_by = NULL 
    WHERE created_by IN (
      SELECT id FROM public.profiles 
      WHERE firm_id = p_firm_id OR current_firm_id = p_firm_id
    );
    
    UPDATE public.freelancer_payments 
    SET created_by = NULL 
    WHERE created_by IN (
      SELECT id FROM public.profiles 
      WHERE firm_id = p_firm_id OR current_firm_id = p_firm_id
    );
    
    UPDATE public.expenses 
    SET created_by = NULL 
    WHERE created_by IN (
      SELECT id FROM public.profiles 
      WHERE firm_id = p_firm_id OR current_firm_id = p_firm_id
    );
    
    UPDATE public.accounting_entries 
    SET created_by = NULL 
    WHERE created_by IN (
      SELECT id FROM public.profiles 
      WHERE firm_id = p_firm_id OR current_firm_id = p_firm_id
    );
    
    UPDATE public.payments 
    SET created_by = NULL 
    WHERE created_by IN (
      SELECT id FROM public.profiles 
      WHERE firm_id = p_firm_id OR current_firm_id = p_firm_id
    );
    
    UPDATE public.quotations 
    SET created_by = NULL 
    WHERE created_by IN (
      SELECT id FROM public.profiles 
      WHERE firm_id = p_firm_id OR current_firm_id = p_firm_id
    );
    
    UPDATE public.event_closing_balances 
    SET created_by = NULL 
    WHERE created_by IN (
      SELECT id FROM public.profiles 
      WHERE firm_id = p_firm_id OR current_firm_id = p_firm_id
    );

    -- IMPORTANT: Remove child rows that still reference profiles/events before deleting profiles
    -- Delete assignment rates linked by events or firm
    DELETE FROM public.event_assignment_rates ear
    USING public.events e
    WHERE ear.event_id = e.id AND e.firm_id = p_firm_id;

    DELETE FROM public.event_assignment_rates
    WHERE firm_id = p_firm_id;

    -- Delete staff assignments linked by events, staff profiles, freelancers, or firm
    DELETE FROM public.event_staff_assignments esa
    USING public.events e
    WHERE esa.event_id = e.id AND e.firm_id = p_firm_id;

    DELETE FROM public.event_staff_assignments
    WHERE staff_id IN (
      SELECT id FROM public.profiles WHERE firm_id = p_firm_id OR current_firm_id = p_firm_id
    )
       OR freelancer_id IN (
      SELECT id FROM public.freelancers WHERE firm_id = p_firm_id
    )
       OR firm_id = p_firm_id;

    -- Now delete all remaining firm-related data
    DELETE FROM public.staff_payments WHERE firm_id = p_firm_id;
    DELETE FROM public.freelancer_payments WHERE firm_id = p_firm_id;
    DELETE FROM public.accounting_entries WHERE firm_id = p_firm_id;
    DELETE FROM public.expenses WHERE firm_id = p_firm_id;
    DELETE FROM public.tasks WHERE firm_id = p_firm_id;
    DELETE FROM public.payments WHERE firm_id = p_firm_id;
    DELETE FROM public.quotations WHERE firm_id = p_firm_id;
    DELETE FROM public.event_closing_balances WHERE firm_id = p_firm_id;
    DELETE FROM public.freelancers WHERE firm_id = p_firm_id;
    DELETE FROM public.clients WHERE firm_id = p_firm_id;
    DELETE FROM public.wa_sessions WHERE firm_id = p_firm_id;
    DELETE FROM public.events WHERE firm_id = p_firm_id;
    DELETE FROM public.firm_payments WHERE firm_id = p_firm_id;
    DELETE FROM public.firm_members WHERE firm_id = p_firm_id;
    
    -- Delete profiles associated with this firm (after dependent rows are removed)
    DELETE FROM public.profiles WHERE firm_id = p_firm_id OR current_firm_id = p_firm_id;
    
    -- Delete subscription and firm last
    DELETE FROM public.firm_subscriptions WHERE firm_id = p_firm_id;
    DELETE FROM public.firms WHERE id = p_firm_id;
  END IF;
END;
$$;