
-- Add foreign key constraints to ensure cascade deletion of related data
-- First, let's add proper foreign key relationships if they don't exist

-- Update quotations table to properly reference events
ALTER TABLE quotations 
ADD CONSTRAINT fk_quotations_converted_event 
FOREIGN KEY (converted_to_event) 
REFERENCES events(id) 
ON DELETE SET NULL;

-- Update payments table to cascade delete with events
ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS payments_event_id_fkey;

ALTER TABLE payments 
ADD CONSTRAINT payments_event_id_fkey 
FOREIGN KEY (event_id) 
REFERENCES events(id) 
ON DELETE CASCADE;

-- Update tasks table to cascade delete with events
ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS tasks_event_id_fkey;

ALTER TABLE tasks 
ADD CONSTRAINT tasks_event_id_fkey 
FOREIGN KEY (event_id) 
REFERENCES events(id) 
ON DELETE CASCADE;

-- Update event_staff_assignments to cascade delete with events
ALTER TABLE event_staff_assignments 
DROP CONSTRAINT IF EXISTS event_staff_assignments_event_id_fkey;

ALTER TABLE event_staff_assignments 
ADD CONSTRAINT event_staff_assignments_event_id_fkey 
FOREIGN KEY (event_id) 
REFERENCES events(id) 
ON DELETE CASCADE;

-- Update freelancer_payments to cascade delete with events
ALTER TABLE freelancer_payments 
DROP CONSTRAINT IF EXISTS freelancer_payments_event_id_fkey;

ALTER TABLE freelancer_payments 
ADD CONSTRAINT freelancer_payments_event_id_fkey 
FOREIGN KEY (event_id) 
REFERENCES events(id) 
ON DELETE CASCADE;

-- Update staff_payments to cascade delete with events
ALTER TABLE staff_payments 
DROP CONSTRAINT IF EXISTS staff_payments_event_id_fkey;

ALTER TABLE staff_payments 
ADD CONSTRAINT staff_payments_event_id_fkey 
FOREIGN KEY (event_id) 
REFERENCES events(id) 
ON DELETE CASCADE;

-- Update event_assignment_rates to cascade delete with events
ALTER TABLE event_assignment_rates 
DROP CONSTRAINT IF EXISTS event_assignment_rates_event_id_fkey;

ALTER TABLE event_assignment_rates 
ADD CONSTRAINT event_assignment_rates_event_id_fkey 
FOREIGN KEY (event_id) 
REFERENCES events(id) 
ON DELETE CASCADE;

-- Create a function to handle comprehensive event deletion with notifications
CREATE OR REPLACE FUNCTION handle_event_deletion()
RETURNS TRIGGER AS $$
DECLARE
    staff_record RECORD;
    client_record RECORD;
BEGIN
    -- Get client information for notification
    SELECT c.* INTO client_record
    FROM clients c 
    WHERE c.id = OLD.client_id;
    
    -- Send notifications to assigned staff members
    FOR staff_record IN 
        SELECT DISTINCT 
            COALESCE(p.telegram_chat_id, '') as telegram_chat_id,
            COALESCE(p.full_name, f.full_name) as staff_name,
            COALESCE(p.mobile_number, f.phone) as staff_phone,
            esa.role
        FROM event_staff_assignments esa
        LEFT JOIN profiles p ON p.user_id = esa.staff_id
        LEFT JOIN freelancers f ON f.id = esa.freelancer_id
        WHERE esa.event_id = OLD.id
    LOOP
        -- Log the notification (can be extended to actually send notifications)
        INSERT INTO sync_queue (
            item_type,
            item_id,
            action,
            data,
            created_at
        ) VALUES (
            'staff_notification',
            OLD.id,
            'event_deletion_notification',
            jsonb_build_object(
                'event_title', OLD.title,
                'event_date', OLD.event_date,
                'staff_name', staff_record.staff_name,
                'staff_phone', staff_record.staff_phone,
                'telegram_chat_id', staff_record.telegram_chat_id,
                'role', staff_record.role,
                'client_name', COALESCE(client_record.name, 'Unknown'),
                'message_type', 'event_cancelled'
            ),
            NOW()
        );
    END LOOP;
    
    -- Send notification to client
    IF client_record.id IS NOT NULL THEN
        INSERT INTO sync_queue (
            item_type,
            item_id,
            action,
            data,
            created_at
        ) VALUES (
            'client_notification',
            OLD.id,
            'event_deletion_notification',
            jsonb_build_object(
                'event_title', OLD.title,
                'event_date', OLD.event_date,
                'client_name', client_record.name,
                'client_phone', client_record.phone,
                'client_email', client_record.email,
                'message_type', 'event_cancelled'
            ),
            NOW()
        );
    END IF;
    
    -- Queue Google Sheets deletion
    INSERT INTO sync_queue (
        item_type,
        item_id,
        action,
        data,
        created_at
    ) VALUES (
        'google_sheets_cleanup',
        OLD.id,
        'delete_event_and_related_data',
        jsonb_build_object(
            'event_id', OLD.id,
            'firm_id', OLD.firm_id,
            'event_title', OLD.title,
            'event_type', OLD.event_type
        ),
        NOW()
    );
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for event deletion notifications
DROP TRIGGER IF EXISTS trigger_event_deletion_notifications ON events;
CREATE TRIGGER trigger_event_deletion_notifications
    BEFORE DELETE ON events
    FOR EACH ROW
    EXECUTE FUNCTION handle_event_deletion();
