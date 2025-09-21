-- Update subscription plans to have realistic features for studio management
UPDATE subscription_plans 
SET features = ARRAY[
  'Event Management & Scheduling',
  'Client Database Management', 
  'Basic Financial Tracking',
  'Staff Assignment & Scheduling',
  'Invoice & Quotation Generation',
  'WhatsApp Integration'
]
WHERE plan_id = 'monthly';

UPDATE subscription_plans 
SET features = ARRAY[
  'Event Management & Scheduling',
  'Client Database Management',
  'Advanced Financial Tracking',
  'Staff & Freelancer Management', 
  'Invoice & Quotation Generation',
  'WhatsApp Integration',
  'Expense Management',
  'Basic Reports & Analytics'
]
WHERE plan_id = 'quarterly';

UPDATE subscription_plans 
SET features = ARRAY[
  'Event Management & Scheduling',
  'Client Database Management',
  'Complete Financial Management',
  'Staff & Freelancer Management',
  'Invoice & Quotation Generation', 
  'WhatsApp Integration',
  'Advanced Expense Management',
  'Detailed Reports & Analytics',
  'Multi-user Access',
  'Priority Support'
]
WHERE plan_id = 'yearly';