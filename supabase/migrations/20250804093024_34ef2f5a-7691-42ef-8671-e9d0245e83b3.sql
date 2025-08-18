-- Enable RLS on tables that are missing it
ALTER TABLE public.staff_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_payments ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.event_staff_assignments ENABLE ROW LEVEL SECURITY;

-- Fix function search paths for security
CREATE OR REPLACE FUNCTION public.update_whatsapp_session_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
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
 SET search_path TO 'public', 'pg_temp'
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

CREATE OR REPLACE FUNCTION public.update_event_editing_status_on_task_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    -- Only process when task status changes to 'Completed'
    IF NEW.status = 'Completed' AND (OLD.status IS NULL OR OLD.status != 'Completed') THEN
        -- Check if this is a photo editing task
        IF (NEW.task_type = 'Photo Editing' OR LOWER(NEW.title) LIKE '%photo%' OR LOWER(NEW.description) LIKE '%photo%') 
           AND NEW.event_id IS NOT NULL THEN
            UPDATE events 
            SET photo_editing_status = true,
                updated_at = now()
            WHERE id = NEW.event_id;
        END IF;
        
        -- Check if this is a video editing task
        IF (NEW.task_type = 'Video Editing' OR LOWER(NEW.title) LIKE '%video%' OR LOWER(NEW.description) LIKE '%video%') 
           AND NEW.event_id IS NOT NULL THEN
            UPDATE events 
            SET video_editing_status = true,
                updated_at = now()
            WHERE id = NEW.event_id;
        END IF;
    END IF;
    
    -- Reset status if task is uncompleted
    IF OLD.status = 'Completed' AND NEW.status != 'Completed' THEN
        -- Reset photo editing status
        IF (NEW.task_type = 'Photo Editing' OR LOWER(NEW.title) LIKE '%photo%' OR LOWER(NEW.description) LIKE '%photo%') 
           AND NEW.event_id IS NOT NULL THEN
            UPDATE events 
            SET photo_editing_status = false,
                updated_at = now()
            WHERE id = NEW.event_id;
        END IF;
        
        -- Reset video editing status
        IF (NEW.task_type = 'Video Editing' OR LOWER(NEW.title) LIKE '%video%' OR LOWER(NEW.description) LIKE '%video%') 
           AND NEW.event_id IS NOT NULL THEN
            UPDATE events 
            SET video_editing_status = false,
                updated_at = now()
            WHERE id = NEW.event_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;