import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user's JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    // Create a supabase client with the user's JWT for RLS
    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } }
      }
    );

    // Get user from JWT
    const { data: { user }, error: userError } = await userSupabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Invalid authentication token');
    }

    // Get user's firm ID from profile
    const { data: profile, error: profileError } = await userSupabase
      .from('profiles')
      .select('current_firm_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.current_firm_id) {
      throw new Error('User has no firm assigned');
    }

    if (profile.role !== 'Admin') {
      throw new Error('Only administrators can generate QR codes');
    }

    console.log('🔐 Generating WhatsApp QR code for firm:', profile.current_firm_id);

    const RAILWAY_URL = Deno.env.get('RAILWAY_WHATSAPP_URL') || 'https://railway-whatsapp-service-production-e337.up.railway.app';
    const sessionId = profile.current_firm_id; // Use firm ID directly as session ID

    // Create or update session in database
    const { data: session, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .upsert({
        firm_id: profile.current_firm_id,
        session_id: sessionId,
        status: 'qr_requested',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'firm_id'
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Database upsert error:', sessionError);
      throw new Error('Failed to save session');
    }

    console.log('📱 Session updated:', session.id);

    // First connect to initialize the WhatsApp client
    try {
      console.log('🔗 Initializing WhatsApp client connection...');
      const connectResponse = await fetch(`${RAILWAY_URL}/api/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          firmId: profile.current_firm_id
        }),
      });

      if (!connectResponse.ok) {
        const connectError = await connectResponse.text();
        throw new Error(`Failed to initialize WhatsApp client: ${connectError}`);
      }

      console.log('✅ WhatsApp client initialized, now requesting QR...');

      // Now request QR code from Railway service
      const qrResponse = await fetch(`${RAILWAY_URL}/api/qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          firmId: profile.current_firm_id
        }),
      });

      if (qrResponse.ok) {
        const qrResult = await qrResponse.json();
        console.log('✅ QR code received from Railway');

        // Update session with QR code
        await supabase
          .from('whatsapp_sessions')
          .update({
            status: 'qr_ready',
            qr_code: qrResult.qr_code,
            last_ping: new Date().toISOString()
          })
          .eq('id', session.id);

        return new Response(JSON.stringify({
          success: true,
          qr_code: qrResult.qr_code,
          session_id: sessionId
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        const errorText = await qrResponse.text();
        throw new Error(`Railway QR service error: ${errorText}`);
      }
    } catch (railwayError) {
      console.error('Railway QR error:', railwayError);
      
      // Update session to failed
      await supabase
        .from('whatsapp_sessions')
        .update({
          status: 'disconnected',
          last_ping: new Date().toISOString()
        })
        .eq('id', session.id);

      throw new Error('Failed to generate QR code');
    }

  } catch (error) {
    console.error('❌ Error in whatsapp-qr:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});