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
  purpose?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp_code, purpose = 'password_reset' }: VerifyOTPRequest = await req.json();

    if (!email || !otp_code) {
      return new Response(
        JSON.stringify({ valid: false, message: "Email and OTP code are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Use the database function to verify OTP
    const { data, error } = await supabase.rpc('verify_otp_only', {
      p_email: email.toLowerCase().trim(),
      p_otp_code: otp_code,
      p_purpose: purpose
    });

    if (error) {
      console.error('Error calling verify_otp_only:', error);
      return new Response(
        JSON.stringify({ valid: false, message: "Failed to verify OTP" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in verify-otp-only function:", error);
    return new Response(
      JSON.stringify({ valid: false, message: error.message || "Failed to verify OTP" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);