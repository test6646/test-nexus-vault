-- Fix RLS policy for wa_sessions to allow service role access
-- This will allow the backend to save WhatsApp session data

DROP POLICY IF EXISTS "Users can manage wa_sessions in their firm" ON public.wa_sessions;

-- Create new policy that allows both user access and service role access
CREATE POLICY "Allow wa_sessions management" 
ON public.wa_sessions 
FOR ALL 
USING (
  -- Allow if user is part of the firm (existing logic)
  (firm_id IN ( 
    SELECT profiles.current_firm_id
    FROM profiles
    WHERE ((profiles.user_id = auth.uid()) AND (profiles.current_firm_id IS NOT NULL))
  )) OR 
  (firm_id IN ( 
    SELECT firms.id
    FROM firms
    WHERE (firms.created_by = auth.uid())
  )) OR
  -- Allow service role to manage all sessions (for backend operations)
  (auth.role() = 'service_role')
)
WITH CHECK (
  -- Same check conditions for inserts/updates
  (firm_id IN ( 
    SELECT profiles.current_firm_id
    FROM profiles
    WHERE ((profiles.user_id = auth.uid()) AND (profiles.current_firm_id IS NOT NULL))
  )) OR 
  (firm_id IN ( 
    SELECT firms.id
    FROM firms
    WHERE (firms.created_by = auth.uid())
  )) OR
  -- Allow service role to manage all sessions
  (auth.role() = 'service_role')
);