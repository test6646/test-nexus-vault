-- Fix payment balance calculation trigger to ensure proper amounts are always calculated
UPDATE events 
SET 
  advance_amount = COALESCE((
    SELECT SUM(p.amount) 
    FROM payments p 
    WHERE p.event_id = events.id
  ), 0),
  balance_amount = COALESCE(events.total_amount, 0) - COALESCE((
    SELECT SUM(p.amount) 
    FROM payments p 
    WHERE p.event_id = events.id
  ), 0),
  updated_at = now()
WHERE TRUE;

-- Log the recalculation for debugging
DO $$
DECLARE
    event_record RECORD;
    total_events INTEGER := 0;
    updated_events INTEGER := 0;
BEGIN
    -- Count total events
    SELECT COUNT(*) INTO total_events FROM events;
    
    -- Count events that have payments
    SELECT COUNT(DISTINCT e.id) INTO updated_events 
    FROM events e 
    LEFT JOIN payments p ON p.event_id = e.id 
    WHERE p.amount IS NOT NULL;
    
    RAISE NOTICE 'Payment recalculation completed: % total events, % events with payments updated', total_events, updated_events;
END $$;