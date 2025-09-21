-- Add invoice_id column to payments table
ALTER TABLE public.payments ADD COLUMN invoice_id TEXT;

-- Create function to generate invoice ID
CREATE OR REPLACE FUNCTION generate_invoice_id()
RETURNS TEXT AS $$
DECLARE
    next_id INTEGER;
    invoice_id TEXT;
BEGIN
    -- Get the next sequential number based on existing payments
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_id FROM 'INV-(\d+)') AS INTEGER)), 0) + 1
    INTO next_id
    FROM payments 
    WHERE invoice_id IS NOT NULL AND invoice_id ~ '^INV-\d+$';
    
    -- If no valid invoice IDs found, start from 1001
    IF next_id IS NULL OR next_id = 1 THEN
        next_id := 1001;
    END IF;
    
    -- Format as INV-XXXX
    invoice_id := 'INV-' || LPAD(next_id::TEXT, 4, '0');
    
    RETURN invoice_id;
END;
$$ LANGUAGE plpgsql;