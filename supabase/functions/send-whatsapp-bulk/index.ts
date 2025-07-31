
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
      console.error('No authorization header');
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Processing request with token');

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
      console.error('Failed to get user:', userError);
      throw new Error('Invalid authentication token');
    }

    console.log('User authenticated:', user.id);

    // Get user's firm ID from profile
    const { data: profile, error: profileError } = await userSupabase
      .from('profiles')
      .select('current_firm_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.current_firm_id) {
      console.error('Profile error:', profileError);
      throw new Error('User has no firm assigned');
    }

    console.log('User firm ID:', profile.current_firm_id);

    const firmId = profile.current_firm_id;

    // Get WhatsApp session for this firm
    const { data: session, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('firm_id', firmId)
      .single();

    if (sessionError || !session) {
      throw new Error('No WhatsApp session found for this firm. Please setup WhatsApp first.');
    }

    const { type, data, staff_list } = await req.json();
    console.log('WhatsApp bulk request:', { type, data, staff_list, session_id: session.session_id });

    const RAILWAY_URL = Deno.env.get('RAILWAY_WHATSAPP_URL') || 'https://railway-whatsapp-service-production-e337.up.railway.app';
    
    let endpoint = '';
    let payload = {};

    switch (type) {
      case 'event':
        endpoint = `/api/send-event-messages`;
        payload = {
          event: data,
          staff_list: staff_list,
          staff_assignments: data.staff_assignments || [],
          firmId: firmId
        };
        break;
      
      case 'task':
        endpoint = `/api/send-task-messages`;
        payload = {
          task: data,
          staff_list: staff_list,
          firmId: firmId
        };
        break;
      
      case 'bulk':
        endpoint = `/api/send-bulk-messages`;
        payload = {
          messages: staff_list.map(staff => ({
            number: staff.mobile_number,
            message: data.message
          })),
          firmId: firmId
        };
        break;
      
      default:
        throw new Error('Invalid message type');
    }

    console.log('Sending to Railway:', endpoint, payload);

    // IMMEDIATE sending - NO QUEUE, SEND NOW
    const response = await fetch(`${RAILWAY_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': session.session_id,
        'X-Immediate-Send': 'true',
        'X-No-Queue': 'true',
        'X-Force-Send': 'true',
        'X-Priority': 'urgent',
        'X-Bypass-Queue': 'true',
        'X-Send-Mode': 'immediate',
        'X-Skip-Queue': 'true',
        'X-Direct-Send': 'true',
      },
      body: JSON.stringify({
        ...payload,
        immediate: true,
        no_queue: true,
        force_send: true,
        send_mode: 'immediate'
      }),
    });
    
    if (!response.ok) {
      const errorResult = await response.json();
      console.error('Railway API error (immediate send):', errorResult);
      throw new Error(errorResult.error || 'Failed to send messages immediately');
    }

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Railway API error:', result);
      throw new Error(result.error || 'Failed to send messages');
    }

    console.log('Railway API success:', result);

    return new Response(JSON.stringify({
      success: true,
      message: 'Messages queued successfully',
      railway_response: result,
      total_messages: staff_list.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-whatsapp-bulk:', error);
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
