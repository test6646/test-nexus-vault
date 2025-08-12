-- CRITICAL: Add trigger to update event amounts when payments change
CREATE OR REPLACE FUNCTION update_event_amounts_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate new amounts when payment is inserted, updated, or deleted
    IF TG_OP = 'DELETE' THEN
        -- Use OLD record for DELETE
        UPDATE events 
        SET 
            advance_amount = COALESCE((
                SELECT SUM(amount) 
                FROM payments 
                WHERE event_id = OLD.event_id
            ), 0),
            balance_amount = total_amount - COALESCE((
                SELECT SUM(amount) 
                FROM payments 
                WHERE event_id = OLD.event_id
            ), 0),
            updated_at = now()
        WHERE id = OLD.event_id;
        
        RETURN OLD;
    ELSE
        -- Use NEW record for INSERT and UPDATE
        UPDATE events 
        SET 
            advance_amount = COALESCE((
                SELECT SUM(amount) 
                FROM payments 
                WHERE event_id = NEW.event_id
            ), 0),
            balance_amount = total_amount - COALESCE((
                SELECT SUM(amount) 
                FROM payments 
                WHERE event_id = NEW.event_id
            ), 0),
            updated_at = now()
        WHERE id = NEW.event_id;
        
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for payment changes
DROP TRIGGER IF EXISTS trigger_update_event_amounts_on_payment_insert ON payments;
DROP TRIGGER IF EXISTS trigger_update_event_amounts_on_payment_update ON payments;
DROP TRIGGER IF EXISTS trigger_update_event_amounts_on_payment_delete ON payments;

CREATE TRIGGER trigger_update_event_amounts_on_payment_insert
    AFTER INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_event_amounts_on_payment();

CREATE TRIGGER trigger_update_event_amounts_on_payment_update
    AFTER UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_event_amounts_on_payment();

CREATE TRIGGER trigger_update_event_amounts_on_payment_delete
    AFTER DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_event_amounts_on_payment();