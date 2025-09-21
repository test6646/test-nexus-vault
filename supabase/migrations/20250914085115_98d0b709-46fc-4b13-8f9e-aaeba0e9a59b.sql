-- Create OTPs table for password reset functionality
CREATE TABLE public.otps (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email text NOT NULL,
    otp_code text NOT NULL,
    purpose text NOT NULL DEFAULT 'password_reset',
    expires_at timestamp with time zone NOT NULL,
    used boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.otps ENABLE ROW LEVEL SECURITY;

-- Create policy for service role to manage OTPs (edge functions)
CREATE POLICY "Service role can manage OTPs" 
ON public.otps 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create index for efficient queries
CREATE INDEX idx_otps_email_purpose ON public.otps(email, purpose) WHERE NOT used;
CREATE INDEX idx_otps_expires_at ON public.otps(expires_at) WHERE NOT used;

-- Create function to cleanup expired OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.otps 
    WHERE expires_at < now() OR used = true;
END;
$$;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_otps_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_otps_updated_at_trigger
    BEFORE UPDATE ON public.otps
    FOR EACH ROW
    EXECUTE FUNCTION public.update_otps_updated_at();