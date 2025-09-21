-- Drop and recreate the trigger function with proper bypassing for DELETE operations
-- The issue is that the trigger is firing on DELETE operations during purging

DROP TRIGGER IF EXISTS enforce_firm_subscription_before_write_trigger ON public.events;
DROP TRIGGER IF EXISTS enforce_firm_subscription_before_write_trigger ON public.clients;
DROP TRIGGER IF EXISTS enforce_firm_subscription_before_write_trigger ON public.tasks;
DROP TRIGGER IF EXISTS enforce_firm_subscription_before_write_trigger ON public.payments;
DROP TRIGGER IF EXISTS enforce_firm_subscription_before_write_trigger ON public.expenses;
DROP TRIGGER IF EXISTS enforce_firm_subscription_before_write_trigger ON public.quotations;
DROP TRIGGER IF EXISTS enforce_firm_subscription_before_write_trigger ON public.freelancers;
DROP TRIGGER IF EXISTS enforce_firm_subscription_before_write_trigger ON public.accounting_entries;
DROP TRIGGER IF EXISTS enforce_firm_subscription_before_write_trigger ON public.event_staff_assignments;
DROP TRIGGER IF EXISTS enforce_firm_subscription_before_write_trigger ON public.event_assignment_rates;
DROP TRIGGER IF EXISTS enforce_firm_subscription_before_write_trigger ON public.staff_payments;
DROP TRIGGER IF EXISTS enforce_firm_subscription_before_write_trigger ON public.freelancer_payments;
DROP TRIGGER IF EXISTS enforce_firm_subscription_before_write_trigger ON public.event_closing_balances;
DROP TRIGGER IF EXISTS enforce_firm_subscription_before_write_trigger ON public.pricing_config;

-- Recreate the function with better logic
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
  -- CRITICAL: Always bypass for service role (needed for purging and system operations)
  -- AND bypass for DELETE operations (purging needs to delete expired trial data)
  IF v_role = 'service_role' OR TG_OP = 'DELETE' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Figure out firm_id
  v_firm_id := COALESCE(NEW.firm_id, OLD.firm_id);

  -- If no firm_id on the row, allow (tables without firm_id shouldn't be gated here)
  IF v_firm_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only block for INSERT/UPDATE (not DELETE) and only for users who have never paid and trial expired
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

-- Recreate triggers on tables that need write protection (only for INSERT/UPDATE, not DELETE)
CREATE TRIGGER enforce_firm_subscription_before_write_trigger
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_firm_subscription_before_write();

CREATE TRIGGER enforce_firm_subscription_before_write_trigger
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_firm_subscription_before_write();

CREATE TRIGGER enforce_firm_subscription_before_write_trigger
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_firm_subscription_before_write();

CREATE TRIGGER enforce_firm_subscription_before_write_trigger
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_firm_subscription_before_write();

CREATE TRIGGER enforce_firm_subscription_before_write_trigger
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_firm_subscription_before_write();

CREATE TRIGGER enforce_firm_subscription_before_write_trigger
  BEFORE INSERT OR UPDATE ON public.quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_firm_subscription_before_write();

CREATE TRIGGER enforce_firm_subscription_before_write_trigger
  BEFORE INSERT OR UPDATE ON public.freelancers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_firm_subscription_before_write();

CREATE TRIGGER enforce_firm_subscription_before_write_trigger
  BEFORE INSERT OR UPDATE ON public.accounting_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_firm_subscription_before_write();

CREATE TRIGGER enforce_firm_subscription_before_write_trigger
  BEFORE INSERT OR UPDATE ON public.event_staff_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_firm_subscription_before_write();

CREATE TRIGGER enforce_firm_subscription_before_write_trigger
  BEFORE INSERT OR UPDATE ON public.event_assignment_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_firm_subscription_before_write();

CREATE TRIGGER enforce_firm_subscription_before_write_trigger
  BEFORE INSERT OR UPDATE ON public.staff_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_firm_subscription_before_write();

CREATE TRIGGER enforce_firm_subscription_before_write_trigger
  BEFORE INSERT OR UPDATE ON public.freelancer_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_firm_subscription_before_write();

CREATE TRIGGER enforce_firm_subscription_before_write_trigger
  BEFORE INSERT OR UPDATE ON public.event_closing_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_firm_subscription_before_write();

CREATE TRIGGER enforce_firm_subscription_before_write_trigger
  BEFORE INSERT OR UPDATE ON public.pricing_config
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_firm_subscription_before_write();