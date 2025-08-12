-- Update payment_method enum to only have Cash and Digital
ALTER TYPE payment_method RENAME TO payment_method_old;

-- Create new enum with only Cash and Digital
CREATE TYPE payment_method AS ENUM ('Cash', 'Digital');

-- Update all tables that use payment_method
ALTER TABLE payments 
  ADD COLUMN payment_method_new payment_method;

-- Set default values based on existing payment methods
UPDATE payments 
SET payment_method_new = CASE 
  WHEN payment_method_old IN ('UPI', 'Bank Transfer', 'Card', 'Cheque') THEN 'Digital'::payment_method
  ELSE 'Cash'::payment_method
END;

-- Set NOT NULL and default
ALTER TABLE payments 
  ALTER COLUMN payment_method_new SET NOT NULL,
  ALTER COLUMN payment_method_new SET DEFAULT 'Cash'::payment_method;

-- Drop old column and rename new one
ALTER TABLE payments DROP COLUMN payment_method;
ALTER TABLE payments RENAME COLUMN payment_method_new TO payment_method;

-- Update expenses table
ALTER TABLE expenses 
  ADD COLUMN payment_method_new payment_method;

UPDATE expenses 
SET payment_method_new = CASE 
  WHEN payment_method_old IN ('UPI', 'Bank Transfer', 'Card', 'Cheque') THEN 'Digital'::payment_method
  ELSE 'Cash'::payment_method
END;

ALTER TABLE expenses 
  ALTER COLUMN payment_method_new SET NOT NULL,
  ALTER COLUMN payment_method_new SET DEFAULT 'Cash'::payment_method;

ALTER TABLE expenses DROP COLUMN payment_method;
ALTER TABLE expenses RENAME COLUMN payment_method_new TO payment_method;

-- Drop old enum type
DROP TYPE payment_method_old;