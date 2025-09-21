-- Update single-firm purge function to avoid using non-existent auth.delete_user and to do DB-only purge
CREATE OR REPLACE FUNCTION public.purge_expired_trial_firm(p_firm_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  firm_owner_user_id uuid;
BEGIN
  -- Only purge if firm is trial-only and past grace
  IF EXISTS (
    SELECT 1 FROM public.firm_subscriptions
    WHERE firm_id = p_firm_id
      AND subscribed_once = FALSE
      AND grace_until < now()
  ) THEN
    -- Get the firm owner's user_id (kept for reference only; we do not delete auth users here)
    SELECT created_by INTO firm_owner_user_id 
    FROM public.firms 
    WHERE id = p_firm_id;

    -- IMPORTANT: Do NOT delete from auth.users here.
    -- Auth deletions are handled by the Edge Function using the Admin API.

    -- Detach references from various tables that store created_by/assigned_to to avoid constraints
    UPDATE public.events 
    SET created_by = NULL 
    WHERE firm_id = p_firm_id;
    
    UPDATE public.tasks 
    SET assigned_to = NULL, created_by = NULL
    WHERE firm_id = p_firm_id;
    
    UPDATE public.staff_payments 
    SET created_by = NULL 
    WHERE firm_id = p_firm_id;
    
    UPDATE public.freelancer_payments 
    SET created_by = NULL 
    WHERE firm_id = p_firm_id;
    
    UPDATE public.expenses 
    SET created_by = NULL 
    WHERE firm_id = p_firm_id;
    
    UPDATE public.accounting_entries 
    SET created_by = NULL 
    WHERE firm_id = p_firm_id;
    
    UPDATE public.payments 
    SET created_by = NULL 
    WHERE firm_id = p_firm_id;
    
    UPDATE public.quotations 
    SET created_by = NULL 
    WHERE firm_id = p_firm_id;
    
    UPDATE public.event_closing_balances 
    SET created_by = NULL 
    WHERE firm_id = p_firm_id;

    -- Remove assignment tables referencing events/profiles/freelancers
    DELETE FROM public.event_assignment_rates ear
    USING public.events e
    WHERE e.id = ear.event_id AND e.firm_id = p_firm_id;

    DELETE FROM public.event_assignment_rates
    WHERE firm_id = p_firm_id;

    DELETE FROM public.event_staff_assignments esa
    USING public.events e
    WHERE e.id = esa.event_id AND e.firm_id = p_firm_id;

    DELETE FROM public.event_staff_assignments
    WHERE firm_id = p_firm_id
       OR staff_id IN (
         SELECT id FROM public.profiles WHERE firm_id = p_firm_id OR current_firm_id = p_firm_id
       )
       OR freelancer_id IN (
         SELECT id FROM public.freelancers WHERE firm_id = p_firm_id
       );

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
$function$;

-- Replace bulk purge function to rely on the single-firm purge for consistent logic
CREATE OR REPLACE FUNCTION public.purge_expired_trial_firms()
RETURNS TABLE(purged_firms_count integer, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  expired_firm_ids UUID[];
  purged_count INTEGER := 0;
  firm_record RECORD;
BEGIN
  -- Get all expired trial firm IDs
  SELECT ARRAY_AGG(fs.firm_id) INTO expired_firm_ids
  FROM public.firm_subscriptions fs
  WHERE fs.subscribed_once = false 
    AND fs.grace_until < NOW();
  
  -- If no expired firms, return early
  IF expired_firm_ids IS NULL OR array_length(expired_firm_ids, 1) = 0 THEN
    RETURN QUERY SELECT 0, 'No expired trial firms found';
    RETURN;
  END IF;
  
  -- Purge each firm using the single-firm function to keep logic centralized
  FOR firm_record IN 
    SELECT unnest(expired_firm_ids) as firm_id
  LOOP
    BEGIN
      PERFORM public.purge_expired_trial_firm(firm_record.firm_id);
      purged_count := purged_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but continue with other firms
      RAISE NOTICE 'Error purging firm %: %', firm_record.firm_id, SQLERRM;
    END;
  END LOOP;
  
  RETURN QUERY SELECT purged_count, format('Successfully purged %s expired trial firms', purged_count);
END;
$function$;