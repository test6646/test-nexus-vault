-- Drop the existing function if it exists and recreate it properly
DROP FUNCTION IF EXISTS purge_expired_trial_firms();

-- Create the purge function that only handles database cleanup
-- Auth user deletion will be handled in the edge function
CREATE OR REPLACE FUNCTION purge_expired_trial_firms()
RETURNS TABLE(
  purged_firms_count INTEGER,
  message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_firm_ids UUID[];
  purged_count INTEGER := 0;
  firm_record RECORD;
BEGIN
  -- Get all expired trial firm IDs
  SELECT ARRAY_AGG(fs.firm_id) INTO expired_firm_ids
  FROM firm_subscriptions fs
  WHERE fs.subscribed_once = false 
  AND fs.grace_until < NOW();
  
  -- If no expired firms, return early
  IF expired_firm_ids IS NULL OR array_length(expired_firm_ids, 1) = 0 THEN
    RETURN QUERY SELECT 0, 'No expired trial firms found';
    RETURN;
  END IF;
  
  -- Delete all related data for each expired firm
  FOR firm_record IN 
    SELECT unnest(expired_firm_ids) as firm_id
  LOOP
    BEGIN
      -- Delete assignment rates and staff assignments
      DELETE FROM event_assignment_rates WHERE firm_id = firm_record.firm_id;
      DELETE FROM event_staff_assignments WHERE firm_id = firm_record.firm_id;
      DELETE FROM staff_payments WHERE firm_id = firm_record.firm_id;
      DELETE FROM freelancer_payments WHERE firm_id = firm_record.firm_id;
      DELETE FROM accounting_entries WHERE firm_id = firm_record.firm_id;
      DELETE FROM expenses WHERE firm_id = firm_record.firm_id;
      DELETE FROM tasks WHERE firm_id = firm_record.firm_id;
      DELETE FROM payments WHERE firm_id = firm_record.firm_id;
      DELETE FROM quotations WHERE firm_id = firm_record.firm_id;
      DELETE FROM pricing_config WHERE firm_id = firm_record.firm_id;
      DELETE FROM event_closing_balances WHERE firm_id = firm_record.firm_id;
      DELETE FROM freelancers WHERE firm_id = firm_record.firm_id;
      DELETE FROM clients WHERE firm_id = firm_record.firm_id;
      DELETE FROM wa_sessions WHERE firm_id = firm_record.firm_id;
      DELETE FROM events WHERE firm_id = firm_record.firm_id;
      DELETE FROM firm_payments WHERE firm_id = firm_record.firm_id;
      DELETE FROM firm_members WHERE firm_id = firm_record.firm_id;
      
      -- Delete profiles associated with this firm (but not the firm owner's profile)
      DELETE FROM profiles 
      WHERE (firm_id = firm_record.firm_id OR current_firm_id = firm_record.firm_id)
      AND user_id != (SELECT created_by FROM firms WHERE id = firm_record.firm_id);
      
      -- Delete firm subscription
      DELETE FROM firm_subscriptions WHERE firm_id = firm_record.firm_id;
      
      -- Delete firm last
      DELETE FROM firms WHERE id = firm_record.firm_id;
      
      purged_count := purged_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but continue with other firms
      RAISE NOTICE 'Error purging firm %: %', firm_record.firm_id, SQLERRM;
    END;
  END LOOP;
  
  RETURN QUERY SELECT purged_count, format('Successfully purged %s expired trial firms', purged_count);
END;
$$;