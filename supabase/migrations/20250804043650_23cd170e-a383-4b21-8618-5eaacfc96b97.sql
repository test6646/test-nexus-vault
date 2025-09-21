-- CRITICAL SECURITY FIX: Enable Row Level Security on all public tables

-- Enable RLS on tables that have policies but RLS is disabled
ALTER TABLE public.event_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

-- Update database functions to have proper search_path security
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

CREATE OR REPLACE FUNCTION public.notify_whatsapp_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    -- Notify any listeners about the status change
    PERFORM pg_notify(
        'whatsapp_status_change',
        json_build_object(
            'session_id', NEW.session_id,
            'firm_id', NEW.firm_id,
            'status', NEW.status,
            'qr_code', CASE WHEN NEW.qr_code IS NOT NULL THEN 'present' ELSE 'none' END
        )::text
    );
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_whatsapp_sessions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    -- Mark sessions as disconnected if they haven't been pinged in 5 minutes
    UPDATE whatsapp_sessions 
    SET 
        status = 'disconnected',
        updated_at = now()
    WHERE 
        status IN ('connected', 'qr_ready', 'connecting')
        AND last_ping < (now() - interval '5 minutes');
        
    -- Log the cleanup
    RAISE LOG 'WhatsApp session validation completed';
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_whatsapp_session_validation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    -- Only validate if we're checking a connected session
    IF NEW.status = 'connected' AND OLD.status != 'connected' THEN
        -- This is a new connection, log it
        RAISE LOG 'New WhatsApp connection detected for session: %', NEW.session_id;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Fix RLS policies for newly enabled tables
CREATE POLICY "Users can manage event staff assignments for their firm"
ON public.event_staff_assignments
FOR ALL
USING (
    firm_id IN (
        SELECT current_firm_id 
        FROM profiles 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage freelancer payments for their firm"
ON public.freelancer_payments
FOR ALL
USING (
    firm_id IN (
        SELECT current_firm_id 
        FROM profiles 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage quotations for their firm"
ON public.quotations
FOR ALL
USING (
    firm_id IN (
        SELECT current_firm_id 
        FROM profiles 
        WHERE user_id = auth.uid()
    )
);