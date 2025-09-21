-- Enable RLS on all tables that have policies but RLS disabled
ALTER TABLE public.event_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- Ensure all critical tables have RLS enabled
ALTER TABLE public.staff_payments ENABLE ROW LEVEL SECURITY;

-- Add missing foreign key constraints for data integrity
ALTER TABLE public.event_staff_assignments 
ADD CONSTRAINT fk_event_staff_assignments_event_id 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE public.event_staff_assignments 
ADD CONSTRAINT fk_event_staff_assignments_staff_id 
FOREIGN KEY (staff_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.event_staff_assignments 
ADD CONSTRAINT fk_event_staff_assignments_freelancer_id 
FOREIGN KEY (freelancer_id) REFERENCES public.freelancers(id) ON DELETE SET NULL;

ALTER TABLE public.payments 
ADD CONSTRAINT fk_payments_event_id 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE public.expenses 
ADD CONSTRAINT fk_expenses_event_id 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;

ALTER TABLE public.tasks 
ADD CONSTRAINT fk_tasks_event_id 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;

ALTER TABLE public.tasks 
ADD CONSTRAINT fk_tasks_assigned_to 
FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.quotations 
ADD CONSTRAINT fk_quotations_client_id 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- Fix function search paths for security
CREATE OR REPLACE FUNCTION public.update_whatsapp_session_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
    NEW.updated_at = now();
    NEW.last_ping = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_duplicate_event_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
    -- Check if client already has an event of this type
    IF EXISTS (
        SELECT 1 FROM events 
        WHERE client_id = NEW.client_id 
        AND event_type = NEW.event_type 
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
        RAISE EXCEPTION 'Client already has an event of type %. Use unique_client_event_type constraint.', NEW.event_type;
    END IF;
    
    RETURN NEW;
END;
$function$;