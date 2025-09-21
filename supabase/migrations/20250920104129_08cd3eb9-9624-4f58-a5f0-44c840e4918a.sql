-- Add plan_id foreign key to firm_subscriptions table
ALTER TABLE public.firm_subscriptions 
ADD COLUMN plan_id TEXT REFERENCES public.subscription_plans(plan_id);

-- Update existing firm subscriptions to map to proper plans
UPDATE public.firm_subscriptions 
SET plan_id = CASE 
  WHEN plan_type = 'monthly' THEN 'monthly'
  WHEN plan_type = 'quarterly' THEN 'quarterly' 
  WHEN plan_type = 'yearly' THEN 'yearly'
  WHEN plan_type = 'annual' THEN 'yearly'
  ELSE NULL
END;

-- Add plan_id foreign key to firm_payments table
ALTER TABLE public.firm_payments 
ADD COLUMN subscription_plan_id TEXT REFERENCES public.subscription_plans(plan_id);

-- Update existing firm payments to map to proper plans  
UPDATE public.firm_payments 
SET subscription_plan_id = CASE 
  WHEN plan_type = 'monthly' THEN 'monthly'
  WHEN plan_type = 'quarterly' THEN 'quarterly'
  WHEN plan_type = 'yearly' THEN 'yearly'
  WHEN plan_type = 'annual' THEN 'yearly'
  ELSE NULL
END;

-- Insert default subscription plans if they don't exist
INSERT INTO public.subscription_plans (plan_id, name, display_name, price, currency, duration_months, features, is_active, sort_order)
VALUES 
  ('monthly', 'monthly', 'Monthly Plan', 599, 'INR', 1, '["Unlimited Events", "Client Management", "Staff Management", "Financial Reports", "WhatsApp Integration", "Google Sheets Sync"]', true, 1),
  ('quarterly', 'quarterly', 'Quarterly Plan', 1499, 'INR', 3, '["Unlimited Events", "Client Management", "Staff Management", "Financial Reports", "WhatsApp Integration", "Google Sheets Sync", "Priority Support"]', true, 2),
  ('yearly', 'yearly', 'Annual Plan', 4999, 'INR', 12, '["Unlimited Events", "Client Management", "Staff Management", "Financial Reports", "WhatsApp Integration", "Google Sheets Sync", "Priority Support", "Advanced Analytics"]', true, 3)
ON CONFLICT (plan_id) DO UPDATE SET
  price = EXCLUDED.price,
  features = EXCLUDED.features,
  display_name = EXCLUDED.display_name;