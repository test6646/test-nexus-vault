-- Enable RLS on all tables that currently have policies but RLS disabled
-- This is critical for security

-- Enable RLS on clients table
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Enable RLS on events table  
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Enable RLS on expenses table
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Enable RLS on quotations table
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on staff_payments table
ALTER TABLE public.staff_payments ENABLE ROW LEVEL SECURITY;

-- Enable RLS on tasks table
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Enable RLS on event_staff_assignments table
ALTER TABLE public.event_staff_assignments ENABLE ROW LEVEL SECURITY;

-- Enable RLS on sync_queue table (this was already enabled but confirming)
-- ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY; -- Already enabled

-- Update database functions to set proper search_path (security fix)
CREATE OR REPLACE FUNCTION public.trigger_google_sheets_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    firm_spreadsheet_id TEXT;
    item_type TEXT;
BEGIN
    -- Determine the item type based on the table
    CASE TG_TABLE_NAME
        WHEN 'clients' THEN item_type := 'client';
        WHEN 'events' THEN item_type := 'event';
        WHEN 'tasks' THEN item_type := 'task';
        WHEN 'expenses' THEN item_type := 'expense';
        ELSE RETURN COALESCE(NEW, OLD);
    END CASE;

    -- Get the firm's spreadsheet ID
    SELECT spreadsheet_id INTO firm_spreadsheet_id
    FROM firms 
    WHERE id = COALESCE(NEW.firm_id, OLD.firm_id);

    -- Only proceed if firm has a spreadsheet configured
    IF firm_spreadsheet_id IS NOT NULL THEN
        -- Use pg_notify to send sync request (non-blocking)
        PERFORM pg_notify(
            'google_sheets_sync',
            json_build_object(
                'item_type', item_type,
                'item_id', COALESCE(NEW.id, OLD.id),
                'firm_id', COALESCE(NEW.firm_id, OLD.firm_id),
                'operation', TG_OP
            )::text
        );
        
        -- Log the sync trigger
        RAISE LOG 'Google Sheets sync triggered for % % (firm: %)', 
            item_type, COALESCE(NEW.id, OLD.id), COALESCE(NEW.firm_id, OLD.firm_id);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_event_balance()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    event_total NUMERIC;
    payment_sum NUMERIC;
BEGIN
    -- Get the event's total amount and current payment sum
    SELECT 
        e.total_amount,
        COALESCE(SUM(p.amount), 0)
    INTO event_total, payment_sum
    FROM events e
    LEFT JOIN payments p ON p.event_id = e.id
    WHERE e.id = COALESCE(NEW.event_id, OLD.event_id)
    GROUP BY e.total_amount;
    
    -- Update the event with accurate calculations
    UPDATE events
    SET 
        advance_amount = COALESCE(payment_sum, 0),
        balance_amount = COALESCE(event_total, 0) - COALESCE(payment_sum, 0),
        updated_at = now()
    WHERE id = COALESCE(NEW.event_id, OLD.event_id);
    
    -- Prevent negative balances (optional validation)
    IF (COALESCE(event_total, 0) - COALESCE(payment_sum, 0)) < 0 THEN
        RAISE WARNING 'Event % has negative balance: payments (%) exceed total (%)', 
            COALESCE(NEW.event_id, OLD.event_id), payment_sum, event_total;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_event_editing_status_on_task_completion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Only process when task status changes to 'Completed'
    IF NEW.status = 'Completed' AND (OLD.status IS NULL OR OLD.status != 'Completed') THEN
        -- Check if this is a photo editing task
        IF (NEW.task_type = 'Photo Editing' OR LOWER(NEW.title) LIKE '%photo%' OR LOWER(NEW.description) LIKE '%photo%') 
           AND NEW.event_id IS NOT NULL THEN
            UPDATE events 
            SET photo_editing_status = true,
                updated_at = now()
            WHERE id = NEW.event_id;
        END IF;
        
        -- Check if this is a video editing task
        IF (NEW.task_type = 'Video Editing' OR LOWER(NEW.title) LIKE '%video%' OR LOWER(NEW.description) LIKE '%video%') 
           AND NEW.event_id IS NOT NULL THEN
            UPDATE events 
            SET video_editing_status = true,
                updated_at = now()
            WHERE id = NEW.event_id;
        END IF;
    END IF;
    
    -- Reset status if task is uncompleted
    IF OLD.status = 'Completed' AND NEW.status != 'Completed' THEN
        -- Reset photo editing status
        IF (NEW.task_type = 'Photo Editing' OR LOWER(NEW.title) LIKE '%photo%' OR LOWER(NEW.description) LIKE '%photo%') 
           AND NEW.event_id IS NOT NULL THEN
            UPDATE events 
            SET photo_editing_status = false,
                updated_at = now()
            WHERE id = NEW.event_id;
        END IF;
        
        -- Reset video editing status
        IF (NEW.task_type = 'Video Editing' OR LOWER(NEW.title) LIKE '%video%' OR LOWER(NEW.description) LIKE '%video%') 
           AND NEW.event_id IS NOT NULL THEN
            UPDATE events 
            SET video_editing_status = false,
                updated_at = now()
            WHERE id = NEW.event_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;