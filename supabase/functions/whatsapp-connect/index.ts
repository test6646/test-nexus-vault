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

    console.log('🏢 User firm ID:', profile.current_firm_id);

    const firmId = profile.current_firm_id;
    const RAILWAY_URL = Deno.env.get('RAILWAY_WHATSAPP_URL') || 'https://railway-whatsapp-service-production-e337.up.railway.app';

    // Check if session already exists
    let { data: session, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('firm_id', firmId)
      .maybeSingle();

    // Create session if it doesn't exist
    if (!session) {
      const sessionId = firmId; // Use firm ID directly as session ID
      
      console.log('🆕 Creating new WhatsApp session for firm:', firmId);
      
      const { data: newSession, error: createError } = await supabase
        .from('whatsapp_sessions')
        .insert({
          firm_id: firmId,
          session_id: sessionId,
          status: 'initializing'
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Database error creating session:', createError);
        throw new Error(`Failed to create WhatsApp session: ${createError.message}`);
      }

      session = newSession;
      console.log('✨ Created new session:', sessionId);
    } else {
      console.log('🔄 Using existing session:', session.session_id);
    }

    console.log('📱 Connecting to Railway service with session:', session.session_id);

    // Connect to Railway WhatsApp service with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('⏰ Railway connect request timeout');
      controller.abort();
    }, 15000); // 15 second timeout for connection
    
    const response = await fetch(`${RAILWAY_URL}/api/connect`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': session.session_id,
        'User-Agent': 'Supabase-Connect-Function'
      },
      body: JSON.stringify({
        sessionId: session.session_id,
        firmId: firmId,
        timestamp: new Date().toISOString()
      }),
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorResult = await response.json();
      console.error('❌ Railway API error:', errorResult);
      throw new Error(errorResult.error || 'Failed to connect to WhatsApp service');
    }

    const result = await response.json();
    console.log('✅ Railway connection initiated:', result);

    // Update session status
    await supabase
      .from('whatsapp_sessions')
      .update({
        status: 'connecting',
        last_ping: new Date().toISOString()
      })
      .eq('id', session.id);

    return new Response(JSON.stringify({
      success: true,
      message: 'WhatsApp connection initiated',
      session_id: session.session_id,
      railway_response: result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in whatsapp-connect:', error);
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