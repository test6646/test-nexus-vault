-- Enable RLS only on tables that don't have it
DO $$
BEGIN
    -- Check and enable RLS on event_staff_assignments if not enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'event_staff_assignments'
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.event_staff_assignments ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Check and enable RLS on freelancer_payments if not enabled  
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'freelancer_payments'
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.freelancer_payments ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Check and enable RLS on quotations if not enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'quotations'
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Check and enable RLS on staff_payments if not enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'staff_payments'
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.staff_payments ENABLE ROW LEVEL SECURITY;
    END IF;
END$$;