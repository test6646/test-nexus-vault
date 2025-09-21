-- Update subscription plans to have realistic features for studio management (jsonb format)
UPDATE subscription_plans 
SET features = '[
  "Event Management & Scheduling",
  "Client Database Management", 
  "Basic Financial Tracking",
  "Staff Assignment & Scheduling",
  "Invoice & Quotation Generation",
  "WhatsApp Integration"
]'::jsonb
WHERE plan_id = 'monthly';

UPDATE subscription_plans 
SET features = '[
  "Event Management & Scheduling",
  "Client Database Management",
  "Advanced Financial Tracking",
  "Staff & Freelancer Management", 
  "Invoice & Quotation Generation",
  "WhatsApp Integration",
  "Expense Management",
  "Basic Reports & Analytics"
]'::jsonb
WHERE plan_id = 'quarterly';

UPDATE subscription_plans 
SET features = '[
  "Event Management & Scheduling",
  "Client Database Management",
  "Complete Financial Management",
  "Staff & Freelancer Management",
  "Invoice & Quotation Generation", 
  "WhatsApp Integration",
  "Advanced Expense Management",
  "Detailed Reports & Analytics",
  "Multi-user Access",
  "Priority Support"
]'::jsonb
WHERE plan_id = 'yearly';