-- Fix the purge_expired_trial_firm function to handle profile foreign key constraints properly
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
    DELETE FROM public.event_closing_balances WHERE firm_id = p_firm_id;
    DELETE FROM public.freelancers WHERE firm_id = p_firm_id;
    DELETE FROM public.clients WHERE firm_id = p_firm_id;
    DELETE FROM public.wa_sessions WHERE firm_id = p_firm_id;
    DELETE FROM public.events WHERE firm_id = p_firm_id;
    DELETE FROM public.firm_payments WHERE firm_id = p_firm_id;
    DELETE FROM public.firm_members WHERE firm_id = p_firm_id;
    
    -- Delete profiles associated with this firm
    DELETE FROM public.profiles WHERE firm_id = p_firm_id OR current_firm_id = p_firm_id;
    
    DELETE FROM public.firm_subscriptions WHERE firm_id = p_firm_id;

    -- Delete firm last
    DELETE FROM public.firms WHERE id = p_firm_id;
  END IF;
END;
$function$;

-- Set up cron job to run purge function at 12:00 AM IST (6:30 PM UTC)
SELECT cron.schedule(
  'purge-expired-trial-firms',
  '30 18 * * *', -- 6:30 PM UTC = 12:00 AM IST
  $$
  SELECT net.http_post(
    url := 'https://tovnbcputrcfznsnccef.supabase.co/functions/v1/purge-expired-trial-firms',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvdm5iY3B1dHJjZnpuc25jY2VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MjQ5MTIsImV4cCI6MjA2NzAwMDkxMn0.7X9cFnxI389pviWP2U2BAAoPOw-nrfoQk8jSdn3bBpc"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  ) as request_id;
  $$
);