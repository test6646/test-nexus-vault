-- Fix double salary entries issue by adding unique constraint and cleaning up duplicates

-- First, identify and clean up any duplicate staff_payments
WITH duplicate_payments AS (
  SELECT 
    id,
    staff_id,
    amount,
    payment_date,
    payment_method,
    firm_id,
    event_id,
    ROW_NUMBER() OVER (
      PARTITION BY staff_id, amount, payment_date, payment_method, firm_id 
      ORDER BY created_at DESC
    ) as rn
  FROM staff_payments
)
DELETE FROM staff_payments 
WHERE id IN (
  SELECT id FROM duplicate_payments WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates for staff payments
ALTER TABLE staff_payments 
ADD CONSTRAINT unique_staff_payment_per_day 
UNIQUE (staff_id, payment_date, amount, payment_method, firm_id);

-- Clean up freelancer payment duplicates
WITH duplicate_freelancer_payments AS (
  SELECT 
    id,
    freelancer_id,
    amount,
    payment_date,
    payment_method,
    firm_id,
    event_id,
    ROW_NUMBER() OVER (
      PARTITION BY freelancer_id, amount, payment_date, payment_method, firm_id 
      ORDER BY created_at DESC
    ) as rn
  FROM freelancer_payments
)
DELETE FROM freelancer_payments 
WHERE id IN (
  SELECT id FROM duplicate_freelancer_payments WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates for freelancer payments
ALTER TABLE freelancer_payments 
ADD CONSTRAINT unique_freelancer_payment_per_day 
UNIQUE (freelancer_id, payment_date, amount, payment_method, firm_id);