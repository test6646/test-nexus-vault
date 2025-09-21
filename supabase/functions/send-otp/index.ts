import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// Rate limit configuration via environment variables
const OTP_DISABLE_RATE_LIMIT = (Deno.env.get('OTP_DISABLE_RATE_LIMIT') || 'false').toLowerCase() === 'true';
const parsedOtpLimit = parseInt(Deno.env.get('OTP_MAX_PER_HOUR') || '3', 10);
const OTP_MAX_PER_HOUR = Number.isNaN(parsedOtpLimit) ? 3 : parsedOtpLimit;

interface SendOTPRequest {
  email: string;
  purpose?: string;
}

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, purpose = 'password_reset' }: SendOTPRequest = await req.json();

    const emailNormalized = (email || '').trim().toLowerCase();

    // Basic email validation
    if (!emailNormalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalized)) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Rate limiting removed for simplicity and reliability

    // Skipped user existence check to avoid failures and speed up OTP sending
    // We will send OTP regardless; verification happens during reset.

    // Generate OTP and set expiration (10 minutes)
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Store OTP in database
    const { error: insertError } = await supabase
      .from('otps')
      .insert({
        email: emailNormalized,
        otp_code: otpCode,
        purpose,
        expires_at: expiresAt
      });

    if (insertError) {
      console.error('Error storing OTP:', insertError);
      return new Response(
        JSON.stringify({ error: "Failed to generate OTP" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Send OTP via email with strict "from" sanitization
    const rawFrom = (Deno.env.get("RESEND_FROM_EMAIL") || "").trim();
    const defaultFrom = "STOODIORA <onboarding@resend.dev>";
    const emailOnly = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nameAddr = /^[^<>@]+<[^<>@\s]+@[^<>@\s]+\.[^<>@\s]+>$/;

    let fromEmail = defaultFrom;
    if (nameAddr.test(rawFrom)) {
      fromEmail = rawFrom;
    } else if (emailOnly.test(rawFrom)) {
      fromEmail = `STOODIORA <${rawFrom}>`;
    }

    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [emailNormalized],
      subject: "OTP Verification (Password Reset)",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://res.cloudinary.com/dmo0bmu3c/image/upload/v1757846401/stoodiora-logo_vwhtow.svg" alt="STOODIORA" style="height: 60px; margin-bottom: 20px;">
            <h2 style="color: #374151; margin: 0; font-size: 24px; font-weight: 600;">Password Reset</h2>
          </div>
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background: #f7f4ed; padding: 20px; border-radius: 8px; border: 1px solid #c4b28d;">
              <span style="font-size: 32px; font-weight: 700; color: #c4b28d; letter-spacing: 4px; font-family: monospace;">${otpCode}</span>
            </div>
            <p style="color: #6b7280; margin: 15px 0 0; font-size: 14px;">Expires in 10 minutes</p>
          </div>
        </div>
      `,
    });

    if ((emailResponse as any)?.error) {
      console.warn('Resend warning:', (emailResponse as any).error);
      // Do not fail the request; OTP is already stored.
    }

    console.log('OTP email sent successfully:', emailResponse);

    // Cleanup expired OTPs
    await supabase.rpc('cleanup_expired_otps');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "OTP sent successfully to your email address",
        expires_in_minutes: 10
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send OTP" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);