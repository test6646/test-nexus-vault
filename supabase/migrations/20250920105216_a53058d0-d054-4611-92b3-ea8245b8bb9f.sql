-- Remove existing subscription plans and add correct ones
DELETE FROM subscription_plans;

-- Insert correct subscription plans with proper pricing
INSERT INTO subscription_plans (plan_id, name, display_name, price, currency, duration_months, features, is_active, sort_order) VALUES
('monthly', 'monthly', 'Monthly Plan', 849, 'INR', 1, ARRAY[
  'Complete Event Management & Scheduling',
  'Client Database & Communication Tools', 
  'Financial Tracking & Expense Management',
  'Staff & Freelancer Management',
  'Invoice & Quotation Generation',
  'WhatsApp Integration & Notifications',
  'Cloud Storage & Automatic Backups',
  'Mobile-Responsive Design',
  'Regular Updates & Support'
], true, 1),
('quarterly', 'quarterly', 'Quarterly Plan', 2499, 'INR', 3, ARRAY[
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
], true, 2),
('yearly', 'yearly', 'Yearly Plan', 8499, 'INR', 12, ARRAY[
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
], true, 3);