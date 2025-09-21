-- Update generate_invoice_id function to reuse invoice ID for same event
CREATE OR REPLACE FUNCTION public.generate_invoice_id(p_event_id uuid DEFAULT NULL)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    existing_invoice_id TEXT;
    next_id INTEGER;
    invoice_id TEXT;
BEGIN
    -- If event_id is provided, check if there's already an invoice for this event
    IF p_event_id IS NOT NULL THEN
        SELECT payments.invoice_id INTO existing_invoice_id
        FROM payments 
        WHERE event_id = p_event_id 
          AND invoice_id IS NOT NULL 
          AND invoice_id ~ '^INV-\d+$'
        LIMIT 1;
        
        -- If found, return the existing invoice ID
        IF existing_invoice_id IS NOT NULL THEN
            RETURN existing_invoice_id;
        END IF;
    END IF;
    
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
$function$;