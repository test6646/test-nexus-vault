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
      throw new Error('Only administrators can access WhatsApp status');
    }

    console.log('🔍 Checking WhatsApp status for firm:', profile.current_firm_id);

    const RAILWAY_URL = Deno.env.get('RAILWAY_WHATSAPP_URL') || 'https://railway-whatsapp-service-production-e337.up.railway.app';
    const sessionId = profile.current_firm_id; // Use firm ID directly as session ID

    // Check existing session in database
    const { data: existingSession, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('firm_id', profile.current_firm_id)
      .maybeSingle();

    if (sessionError && sessionError.code !== 'PGRST116') {
      console.error('Session error:', sessionError);
    }

    let status = 'disconnected';
    let ready = false;
    let qrAvailable = false;
    let queueLength = 0;
    let connectedAt = null;

    // Check Railway service status
    try {
      const response = await fetch(`${RAILWAY_URL}/api/status/${sessionId}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const railwayStatus = await response.json();
        console.log('Railway status response:', railwayStatus);
        
        status = railwayStatus.status || 'disconnected';
        ready = railwayStatus.ready || false;
        qrAvailable = railwayStatus.qr_available || false;
        queueLength = railwayStatus.queue_length || 0;
        connectedAt = railwayStatus.connected_at || existingSession?.connected_at;

        // Update database with latest status
        if (existingSession) {
          await supabase
            .from('whatsapp_sessions')
            .update({
              status: status,
              last_ping: new Date().toISOString(),
              connected_at: connectedAt
            })
            .eq('id', existingSession.id);
        }
      } else {
        console.error('Railway API error:', response.status, response.statusText);
        // Fall back to database status
        if (existingSession) {
          status = existingSession.status || 'disconnected';
          ready = status === 'ready' || status === 'connected';
          qrAvailable = !!existingSession.qr_code;
          connectedAt = existingSession.connected_at;
        }
      }
    } catch (error) {
      console.error('Error checking Railway status:', error);
      // Fall back to database status
      if (existingSession) {
        status = existingSession.status || 'disconnected';
        ready = status === 'ready' || status === 'connected';
        qrAvailable = !!existingSession.qr_code;
        connectedAt = existingSession.connected_at;
      }
    }

    // Return actual status
    return new Response(JSON.stringify({
      success: true,
      status: status,
      ready: ready,
      qr_available: qrAvailable,
      queue_length: queueLength,
      session_id: sessionId,
      firm_id: profile.current_firm_id,
      connected_at: connectedAt
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in whatsapp-status:', error);
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