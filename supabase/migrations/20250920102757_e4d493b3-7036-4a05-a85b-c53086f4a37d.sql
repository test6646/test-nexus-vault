-- Create subscription_plans table to store plan configurations
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  duration_months INTEGER NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (everyone can see available plans)
CREATE POLICY "subscription_plans_public_read" 
ON public.subscription_plans 
FOR SELECT 
USING (is_active = true);

-- Insert the three subscription plans
INSERT INTO public.subscription_plans (plan_id, name, display_name, price, duration_months, features, sort_order) VALUES
('monthly', 'monthly', 'Monthly Plan', 849, 1, '["Unlimited events and clients", "Task management", "Financial tracking", "WhatsApp integration", "PDF exports", "Priority support"]'::jsonb, 1),
('quarterly', 'quarterly', 'Quarterly Plan', 2499, 3, '["Everything in Monthly", "3 months commitment", "Better value per month", "Advanced reporting", "Bulk operations", "Priority support"]'::jsonb, 2),
('yearly', 'yearly', 'Yearly Plan', 8499, 12, '["Everything in Quarterly", "12 months commitment", "Best value per month", "Early access to features", "Premium support", "Custom integrations"]'::jsonb, 3);

-- Add trigger for automatic updated_at
CREATE OR REPLACE FUNCTION public.update_subscription_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_subscription_plans_updated_at();