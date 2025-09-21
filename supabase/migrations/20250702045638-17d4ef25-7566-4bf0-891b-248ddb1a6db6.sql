
-- Create firm_members table for multi-firm access management
CREATE TABLE public.firm_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'Member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(firm_id, user_id)
);

-- Enable RLS on firm_members
ALTER TABLE public.firm_members ENABLE ROW LEVEL SECURITY;

-- Create policies for firm_members
CREATE POLICY "Users can view their firm memberships" 
  ON public.firm_members 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage firm memberships" 
  ON public.firm_members 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'Admin'
      AND firm_id IN (
        SELECT firm_id FROM public.firm_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Add indexes for better performance
CREATE INDEX idx_firm_members_user_id ON public.firm_members(user_id);
CREATE INDEX idx_firm_members_firm_id ON public.firm_members(firm_id);
CREATE INDEX idx_events_firm_id ON public.events(firm_id);
CREATE INDEX idx_clients_firm_id ON public.clients(firm_id);
CREATE INDEX idx_payments_firm_id ON public.payments(firm_id);

-- Add current_firm_id to profiles table for better UX
ALTER TABLE public.profiles ADD COLUMN current_firm_id UUID REFERENCES public.firms(id);
