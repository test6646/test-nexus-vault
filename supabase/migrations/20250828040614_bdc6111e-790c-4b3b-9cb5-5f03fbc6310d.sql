-- CRITICAL SECURITY FIX: Restrict firms table public access
DROP POLICY IF EXISTS "Allow limited firm viewing for signup" ON public.firms;

-- Only allow viewing firm name and ID for signup, not sensitive data
CREATE POLICY "Allow limited firm info for signup" ON public.firms
FOR SELECT USING (true);

-- But hide sensitive columns from public access
GRANT SELECT (id, name) ON public.firms TO anon;
REVOKE SELECT ON public.firms FROM anon;
GRANT SELECT (id, name) ON public.firms TO anon;

-- CRITICAL: Fix sync_queue public access
DROP POLICY IF EXISTS "System can manage sync queue" ON public.sync_queue;

CREATE POLICY "Only authenticated users can view sync queue" ON public.sync_queue
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only service role can manage sync queue" ON public.sync_queue
FOR ALL USING (auth.role() = 'service_role');

-- Fix function security definer issues
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_firm_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT firm_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_firm_profile_ids(target_firm_id uuid)
RETURNS TABLE(profile_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT id FROM public.profiles 
  WHERE firm_id = target_firm_id OR current_firm_id = target_firm_id;
$$;