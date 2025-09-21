-- Add triggers for updating balances when payments are modified
CREATE OR REPLACE FUNCTION public.update_event_balance()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Update the event balance whenever payments are modified
    UPDATE public.events
    SET 
        advance_amount = COALESCE((
            SELECT SUM(amount) 
            FROM public.payments 
            WHERE event_id = COALESCE(NEW.event_id, OLD.event_id)
        ), 0),
        balance_amount = total_amount - COALESCE((
            SELECT SUM(amount) 
            FROM public.payments 
            WHERE event_id = COALESCE(NEW.event_id, OLD.event_id)
        ), 0),
        updated_at = now()
    WHERE id = COALESCE(NEW.event_id, OLD.event_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create triggers for payment updates
DROP TRIGGER IF EXISTS update_event_balance_on_payment_insert ON public.payments;
CREATE TRIGGER update_event_balance_on_payment_insert
    AFTER INSERT ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_event_balance();

DROP TRIGGER IF EXISTS update_event_balance_on_payment_update ON public.payments;
CREATE TRIGGER update_event_balance_on_payment_update
    AFTER UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_event_balance();

DROP TRIGGER IF EXISTS update_event_balance_on_payment_delete ON public.payments;
CREATE TRIGGER update_event_balance_on_payment_delete
    AFTER DELETE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_event_balance();