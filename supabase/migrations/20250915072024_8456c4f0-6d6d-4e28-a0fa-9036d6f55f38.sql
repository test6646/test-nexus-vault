-- Create function to verify OTP without resetting password
CREATE OR REPLACE FUNCTION verify_otp_only(
  p_email TEXT,
  p_otp_code TEXT,
  p_purpose TEXT DEFAULT 'password_reset'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_otp_record RECORD;
BEGIN
  -- Find valid, unused OTP
  SELECT * INTO v_otp_record
  FROM otps
  WHERE email = LOWER(p_email)
    AND otp_code = p_otp_code
    AND purpose = p_purpose
    AND used = false
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  -- Check if OTP exists and is valid
  IF v_otp_record IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Invalid or expired OTP code');
  END IF;

  -- OTP is valid but don't mark as used yet (save that for actual password reset)
  RETURN jsonb_build_object('valid', true, 'message', 'OTP verified successfully');
END;
$$;