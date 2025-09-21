import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

interface VerifyOTPRequest {
  email: string;
  otp_code: string;
  new_password: string;
  purpose?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp_code, new_password, purpose = 'password_reset' }: VerifyOTPRequest = await req.json();

    if (!email || !otp_code || !new_password) {
      return new Response(
        JSON.stringify({ error: "Email, OTP code, and new password are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate password strength (basic validation)
    if (new_password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters long" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Find valid, unused OTP
    const { data: otpData, error: otpError } = await supabase
      .from('otps')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('otp_code', otp_code)
      .eq('purpose', purpose)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpData) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired OTP code" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get user by email using listUsers (getUserByEmail doesn't exist)
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return new Response(
        JSON.stringify({ error: "Failed to verify user" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    const userData = users.find(user => user.email === email.toLowerCase());
    
    if (!userData) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Update user password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userData.id,
      { password: new_password }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update password" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Mark OTP as used
    const { error: markUsedError } = await supabase
      .from('otps')
      .update({ used: true, updated_at: new Date().toISOString() })
      .eq('id', otpData.id);

    if (markUsedError) {
      console.error('Error marking OTP as used:', markUsedError);
    }

    // Cleanup expired OTPs
    await supabase.rpc('cleanup_expired_otps');

    console.log(`Password successfully reset for user: ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password updated successfully. You can now sign in with your new password." 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in verify-otp-reset function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to verify OTP and reset password" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);