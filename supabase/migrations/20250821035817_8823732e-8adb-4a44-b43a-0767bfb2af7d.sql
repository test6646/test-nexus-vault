-- Drop ALL existing payment-related triggers first
DROP TRIGGER IF EXISTS update_event_amounts_trigger ON payments;
DROP TRIGGER IF EXISTS update_payment_balance_only ON payments;
DROP TRIGGER IF EXISTS update_event_amounts_on_payment_clean ON payments;

-- Now drop the functions
DROP FUNCTION IF EXISTS update_event_amounts_on_payment() CASCADE;

-- Create new function that ONLY updates balance_amount (keeps advance_amount untouched)
CREATE OR REPLACE FUNCTION update_balance_amount_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate new balance when payment is inserted, updated, or deleted
    -- CRITICAL: This does NOT touch advance_amount - keeps it immutable!
    IF TG_OP = 'DELETE' THEN
        -- Use OLD record for DELETE
        UPDATE events 
        SET 
            balance_amount = total_amount - (
                COALESCE(advance_amount, 0) + 
                COALESCE((SELECT SUM(amount) FROM payments WHERE event_id = OLD.event_id), 0)
            ),
            updated_at = now()
        WHERE id = OLD.event_id;
        
        RETURN OLD;
    ELSE
        -- Use NEW record for INSERT and UPDATE
        UPDATE events 
        SET 
            balance_amount = total_amount - (
                COALESCE(advance_amount, 0) + 
                COALESCE((SELECT SUM(amount) FROM payments WHERE event_id = NEW.event_id), 0)
            ),
            updated_at = now()
        WHERE id = NEW.event_id;
        
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger that ONLY updates balance_amount (keeps advance_amount untouched)
CREATE TRIGGER update_balance_amount_trigger
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_balance_amount_on_payment();