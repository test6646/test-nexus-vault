-- Update payment_method enum to only have Cash and Digital
DROP TYPE IF EXISTS payment_method CASCADE;

-- Create new enum with only Cash and Digital  
CREATE TYPE payment_method AS ENUM ('Cash', 'Digital');

-- Update payments table - recreate payment_method column
ALTER TABLE payments 
  ALTER COLUMN payment_method DROP DEFAULT,
  ALTER COLUMN payment_method TYPE payment_method USING 
    CASE 
      WHEN payment_method::text IN ('UPI', 'Bank Transfer', 'Card', 'Cheque') THEN 'Digital'::payment_method
      ELSE 'Cash'::payment_method
    END,
  ALTER COLUMN payment_method SET DEFAULT 'Cash'::payment_method;

-- Update expenses table - recreate payment_method column
ALTER TABLE expenses 
  ALTER COLUMN payment_method DROP DEFAULT,
  ALTER COLUMN payment_method TYPE payment_method USING 
    CASE 
      WHEN payment_method::text IN ('UPI', 'Bank Transfer', 'Card', 'Cheque') THEN 'Digital'::payment_method
      ELSE 'Cash'::payment_method
    END,
  ALTER COLUMN payment_method SET DEFAULT 'Cash'::payment_method;