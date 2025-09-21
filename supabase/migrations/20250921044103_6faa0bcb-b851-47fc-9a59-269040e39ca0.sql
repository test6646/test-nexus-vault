-- Fix 1: Clean up subscription_plans table - remove unused features column since we use unified features
ALTER TABLE subscription_plans DROP COLUMN IF EXISTS features;

-- Fix 2: Remove redundant plan_id from firm_subscriptions since we have plan_type
ALTER TABLE firm_subscriptions DROP COLUMN IF EXISTS plan_id;

-- Fix 3: Remove redundant subscription_plan_id from firm_payments since we have plan_type
ALTER TABLE firm_payments DROP COLUMN IF EXISTS subscription_plan_id;

-- Fix 4: Add index for better performance on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_firm_subscriptions_firm_status ON firm_subscriptions(firm_id, status);
CREATE INDEX IF NOT EXISTS idx_firm_payments_firm_status ON firm_payments(firm_id, status);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active_sort ON subscription_plans(is_active, sort_order);