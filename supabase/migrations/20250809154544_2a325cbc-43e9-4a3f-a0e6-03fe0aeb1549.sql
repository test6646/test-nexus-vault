-- Update the handle_new_user_profile function to remove telegram_chat_id references
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    -- Only create profile when email is confirmed
    IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
        -- Check if profile already exists
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
            -- Create profile from user metadata
            INSERT INTO public.profiles (
                user_id,
                full_name,
                mobile_number,
                role,
                firm_id,
                current_firm_id
            ) VALUES (
                NEW.id,
                COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User'),
                COALESCE(NEW.raw_user_meta_data->>'mobile_number', ''),
                COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'Other'::user_role),
                CASE 
                    WHEN NEW.raw_user_meta_data->>'role' = 'Admin' THEN NULL
                    ELSE (NEW.raw_user_meta_data->>'firm_id')::uuid
                END,
                CASE 
                    WHEN NEW.raw_user_meta_data->>'role' = 'Admin' THEN NULL
                    ELSE (NEW.raw_user_meta_data->>'firm_id')::uuid
                END
            );
            
            -- Create firm membership for non-admin users
            IF NEW.raw_user_meta_data->>'role' != 'Admin' AND NEW.raw_user_meta_data->>'firm_id' IS NOT NULL THEN
                INSERT INTO public.firm_members (
                    firm_id,
                    user_id,
                    role
                ) VALUES (
                    (NEW.raw_user_meta_data->>'firm_id')::uuid,
                    NEW.id,
                    NEW.raw_user_meta_data->>'role'
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;