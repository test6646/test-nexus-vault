-- First, clear foreign key references in firm_payments 
UPDATE firm_payments SET subscription_plan_id = NULL WHERE subscription_plan_id IS NOT NULL;

-- Update existing subscription plans with correct pricing and features
UPDATE subscription_plans 
SET 
  price = 849,
  features = ARRAY[
    'Complete Event Management & Scheduling',
    'Client Database & Communication Tools', 
    'Financial Tracking & Expense Management',
    'Staff & Freelancer Management',
    'Invoice & Quotation Generation',
    'WhatsApp Integration & Notifications',
    'Cloud Storage & Automatic Backups',
    'Mobile-Responsive Design',
    'Regular Updates & Support'
  ]
WHERE plan_id = 'monthly';

UPDATE subscription_plans 
SET 
  price = 2499,
  features = ARRAY[
    'Complete Event Management & Scheduling',
    'Client Database & Communication Tools', 
    'Financial Tracking & Expense Management',
    'Staff & Freelancer Management',
    'Invoice & Quotation Generation',
    'WhatsApp Integration & Notifications',
    'Cloud Storage & Automatic Backups',
    'Mobile-Responsive Design',
    'Regular Updates & Support',
    'Priority Customer Support'
  ]
WHERE plan_id = 'quarterly';

UPDATE subscription_plans 
SET 
  price = 8499,
  features = ARRAY[
    'Complete Event Management & Scheduling',
    'Client Database & Communication Tools', 
    'Financial Tracking & Expense Management',
    'Staff & Freelancer Management',
    'Invoice & Quotation Generation',
    'WhatsApp Integration & Notifications',
    'Cloud Storage & Automatic Backups',
    'Mobile-Responsive Design',
    'Regular Updates & Support',
    'Priority Customer Support',
    'Advanced Analytics & Reports',
    'Dedicated Account Manager'
  ]
WHERE plan_id = 'yearly';