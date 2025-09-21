-- Add drone_pilot_id column to events table
ALTER TABLE events 
ADD COLUMN drone_pilot_id uuid;

-- Update user role enum to include Cinematographer and Drone Pilot
ALTER TYPE user_role RENAME TO user_role_old;
CREATE TYPE user_role AS ENUM ('Admin', 'Photographer', 'Cinematographer', 'Editor', 'Drone Pilot', 'Other');

-- Update profiles table to use new enum
ALTER TABLE profiles 
ALTER COLUMN role DROP DEFAULT,
ALTER COLUMN role TYPE user_role USING 
  CASE role::text 
    WHEN 'Videographer' THEN 'Cinematographer'::user_role
    ELSE role::text::user_role 
  END,
ALTER COLUMN role SET DEFAULT 'Other'::user_role;

-- Drop old enum
DROP TYPE user_role_old;

-- Insert Bhavesh Patel as drone pilot if not exists
INSERT INTO profiles (user_id, full_name, mobile_number, role, firm_id, current_firm_id)
SELECT 
  gen_random_uuid(),
  'Bhavesh Patel',
  '9999999999',
  'Drone Pilot'::user_role,
  NULL,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE full_name = 'Bhavesh Patel' AND role = 'Drone Pilot'
);

-- Create trigger to update event balance (if not exists)
CREATE OR REPLACE FUNCTION update_event_balance_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- Update event balance when payment is added/modified/deleted
    IF TG_OP = 'DELETE' THEN
        UPDATE events SET 
            advance_amount = COALESCE((
                SELECT SUM(amount) FROM payments WHERE event_id = OLD.event_id
            ), 0),
            balance_amount = total_amount - COALESCE((
                SELECT SUM(amount) FROM payments WHERE event_id = OLD.event_id
            ), 0),
            updated_at = NOW()
        WHERE id = OLD.event_id;
        RETURN OLD;
    ELSE
        UPDATE events SET 
            advance_amount = COALESCE((
                SELECT SUM(amount) FROM payments WHERE event_id = NEW.event_id
            ), 0),
            balance_amount = total_amount - COALESCE((
                SELECT SUM(amount) FROM payments WHERE event_id = NEW.event_id
            ), 0),
            updated_at = NOW()
        WHERE id = NEW.event_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;