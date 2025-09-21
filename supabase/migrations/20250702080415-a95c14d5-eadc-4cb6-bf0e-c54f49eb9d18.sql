
-- Add editor_id column to events table if it doesn't exist
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS editor_id UUID REFERENCES public.profiles(id);

-- Update the trigger function to handle the new column
CREATE OR REPLACE FUNCTION public.update_event_balance()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;
