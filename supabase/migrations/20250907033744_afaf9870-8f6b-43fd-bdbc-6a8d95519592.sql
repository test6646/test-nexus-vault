-- Fix the firm subscription enforcement function to allow purging by service role
-- The issue is that even service role is being blocked when trying to purge expired trial firms

CREATE OR REPLACE FUNCTION public.enforce_firm_subscription_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_role text := auth.role();
  v_firm_id uuid;
BEGIN
  -- CRITICAL FIX: Always bypass for service role (needed for purging and system operations)
  IF v_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Figure out firm_id
  v_firm_id := COALESCE(NEW.firm_id, OLD.firm_id);

  -- If no firm_id on the row, allow (tables without firm_id shouldn't be gated here)
  IF v_firm_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only block for INSERT/UPDATE and only for users who have never paid and trial expired
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Check if firm is writable (now includes paid users even after expiry)
    IF NOT public.is_firm_writable(v_firm_id) THEN
      -- Only show error for trial users, not paid users
      DECLARE
        v_subscribed_once boolean := FALSE;
      BEGIN
        SELECT subscribed_once INTO v_subscribed_once 
        FROM public.firm_subscriptions 
        WHERE firm_id = v_firm_id;
        
        -- Only block true trial users (never paid)
        IF v_subscribed_once = FALSE THEN
          RAISE EXCEPTION 'Your 3-day trial has expired. Please upgrade to continue using the service. Contact: pritphoto1985@gmail.com / +917265072603';
        END IF;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;