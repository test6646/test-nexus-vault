-- Drop the old trigger and function
DROP TRIGGER IF EXISTS on_user_email_confirmed ON auth.users;
DROP FUNCTION IF EXISTS public.sync_new_staff_to_google_sheets();

-- Create a simple trigger function that just logs the event
-- The actual sync will be handled by the application layer
CREATE OR REPLACE FUNCTION public.sync_new_staff_to_google_sheets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only trigger when email_confirmed_at changes from null to not null (user confirms email)
    IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
        RAISE LOG 'New staff sync needed for confirmed user: % (email: %)', NEW.id, NEW.email;
        
        -- Insert into a sync queue table that can be processed by the application
        INSERT INTO public.sync_queue (
            item_type,
            item_id,
            action,
            data,
            created_at
        ) VALUES (
            'new_staff',
            NEW.id,
            'sync_to_google_sheets',
            jsonb_build_object(
                'user_id', NEW.id,
                'email', NEW.email,
                'confirmed_at', NEW.email_confirmed_at
            ),
            NOW()
        );
        
        RAISE LOG 'Staff sync queued for user: %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create a sync queue table to handle async operations
CREATE TABLE IF NOT EXISTS public.sync_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_type TEXT NOT NULL,
    item_id UUID NOT NULL,
    action TEXT NOT NULL,
    data JSONB,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on sync_queue
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (since this is internal)
CREATE POLICY "Allow all operations on sync_queue" 
ON public.sync_queue 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create trigger on auth.users table for email confirmation
CREATE TRIGGER on_user_email_confirmed
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_new_staff_to_google_sheets();