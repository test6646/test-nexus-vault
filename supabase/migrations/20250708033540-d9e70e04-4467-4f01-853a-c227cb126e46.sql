-- PHASE 1: EMERGENCY DATABASE FIXES

-- First, let's see current duplicates before cleanup
-- (This is for reference, the actual cleanup will be done after constraint)

-- Add unique constraint to prevent duplicate event types for same client
-- Note: This will fail if duplicates exist, so we need to clean them first

-- Step 1: Create a temporary function to merge duplicate events
CREATE OR REPLACE FUNCTION merge_duplicate_events()
RETURNS void AS $$
DECLARE
    duplicate_record RECORD;
    keep_event_id UUID;
    delete_event_id UUID;
BEGIN
    -- Find all duplicate client + event_type combinations
    FOR duplicate_record IN
        SELECT client_id, event_type, array_agg(id ORDER BY total_amount DESC NULLS LAST, created_at DESC) as event_ids
        FROM events 
        WHERE client_id IS NOT NULL
        GROUP BY client_id, event_type 
        HAVING COUNT(*) > 1
    LOOP
        -- Keep the first event (highest total_amount or latest created_at)
        keep_event_id := duplicate_record.event_ids[1];
        
        -- Process all duplicate events to be deleted
        FOR i IN 2..array_length(duplicate_record.event_ids, 1) LOOP
            delete_event_id := duplicate_record.event_ids[i];
            
            -- Transfer payments from duplicate to kept event
            UPDATE payments 
            SET event_id = keep_event_id 
            WHERE event_id = delete_event_id;
            
            -- Transfer tasks from duplicate to kept event  
            UPDATE tasks 
            SET event_id = keep_event_id 
            WHERE event_id = delete_event_id;
            
            -- Transfer expenses from duplicate to kept event
            UPDATE expenses 
            SET event_id = keep_event_id 
            WHERE event_id = delete_event_id;
            
            -- Transfer staff payments from duplicate to kept event
            UPDATE staff_payments 
            SET event_id = keep_event_id 
            WHERE event_id = delete_event_id;
            
            -- Delete the duplicate event
            DELETE FROM events WHERE id = delete_event_id;
            
            RAISE NOTICE 'Merged duplicate event % into %', delete_event_id, keep_event_id;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Execute the merge function
SELECT merge_duplicate_events();

-- Step 3: Now add the unique constraint
ALTER TABLE events 
ADD CONSTRAINT unique_client_event_type 
UNIQUE (client_id, event_type);

-- Step 4: Improve the balance calculation trigger
CREATE OR REPLACE FUNCTION update_event_balance()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
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
$function$;

-- Step 5: Create triggers for balance updates
DROP TRIGGER IF EXISTS trigger_update_event_balance_on_payment_insert ON payments;
DROP TRIGGER IF EXISTS trigger_update_event_balance_on_payment_update ON payments;
DROP TRIGGER IF EXISTS trigger_update_event_balance_on_payment_delete ON payments;

CREATE TRIGGER trigger_update_event_balance_on_payment_insert
    AFTER INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_event_balance();

CREATE TRIGGER trigger_update_event_balance_on_payment_update
    AFTER UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_event_balance();

CREATE TRIGGER trigger_update_event_balance_on_payment_delete
    AFTER DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_event_balance();

-- Step 6: Recalculate all existing event balances
UPDATE events SET 
    advance_amount = COALESCE((
        SELECT SUM(amount) 
        FROM payments 
        WHERE event_id = events.id
    ), 0),
    balance_amount = COALESCE(total_amount, 0) - COALESCE((
        SELECT SUM(amount) 
        FROM payments 
        WHERE event_id = events.id
    ), 0)
WHERE id IS NOT NULL;

-- Step 7: Add validation function for duplicate prevention
CREATE OR REPLACE FUNCTION check_duplicate_event_type()
RETURNS trigger AS $$
BEGIN
    -- Check if client already has an event of this type
    IF EXISTS (
        SELECT 1 FROM events 
        WHERE client_id = NEW.client_id 
        AND event_type = NEW.event_type 
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
        RAISE EXCEPTION 'Client already has an event of type %. Use unique_client_event_type constraint.', NEW.event_type;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Clean up the temporary function
DROP FUNCTION merge_duplicate_events();