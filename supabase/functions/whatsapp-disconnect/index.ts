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

    console.log('🔐 User authenticated:', user.id);

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
      throw new Error('Only administrators can manage WhatsApp settings');
    }

    const firmId = profile.current_firm_id;
    const RAILWAY_URL = Deno.env.get('RAILWAY_WHATSAPP_URL') || 'https://railway-whatsapp-service-production-e337.up.railway.app';

    // Get session for this firm
    const { data: session, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('firm_id', firmId)
      .single();

    if (sessionError || !session) {
      throw new Error('No WhatsApp session found for this firm');
    }

    console.log('📱 Disconnecting from Railway service with session:', session.session_id);

    // Disconnect from Railway WhatsApp service
    const response = await fetch(`${RAILWAY_URL}/api/disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': session.session_id,
      },
      body: JSON.stringify({
        sessionId: session.session_id,
        firmId: firmId
      }),
    });

    if (!response.ok) {
      const errorResult = await response.json();
      console.error('❌ Railway API error:', errorResult);
      throw new Error(errorResult.error || 'Failed to disconnect from WhatsApp service');
    }

    const result = await response.json();
    console.log('✅ Railway disconnection successful:', result);

    // Update session status
    await supabase
      .from('whatsapp_sessions')
      .update({
        status: 'disconnected',
        qr_code: null,
        connected_at: null,
        last_ping: new Date().toISOString()
      })
      .eq('id', session.id);

    return new Response(JSON.stringify({
      success: true,
      message: 'WhatsApp disconnected successfully',
      railway_response: result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in whatsapp-disconnect:', error);
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