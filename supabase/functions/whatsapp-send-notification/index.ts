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
    const { type, data, staff_data, firm_id } = await req.json();
    
    console.log('📱 WhatsApp notification request:', { type, firm_id });

    // Get WhatsApp session for this firm
    const { data: session, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('firm_id', firm_id)
      .eq('status', 'connected')
      .single();

    if (sessionError || !session) {
      console.log('⚠️ No active WhatsApp session for firm:', firm_id);
      return new Response(JSON.stringify({
        success: false,
        error: 'WhatsApp not connected for this firm',
        code: 'NO_WHATSAPP_SESSION'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const RAILWAY_URL = 'https://railway-baileys-service-production.up.railway.app';
    let endpoint = '';
    let payload = {};

    switch (type) {
      case 'event':
        endpoint = '/api/send-event-notification';
        payload = {
          sessionId: session.session_id,
          eventData: data,
          staffList: staff_data
        };
        break;
      
      case 'task':
        endpoint = '/api/send-task-notification';
        payload = {
          sessionId: session.session_id,
          taskData: data,
          staffMember: staff_data
        };
        break;
      
      default:
        throw new Error('Invalid notification type');
    }

    console.log('📤 Sending notification to Railway:', endpoint);

    // Send notification via Railway service
    const response = await fetch(`${RAILWAY_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorResult = await response.json();
      console.error('❌ Railway API error:', errorResult);
      throw new Error(errorResult.error || 'Failed to send notification');
    }

    const result = await response.json();
    console.log('✅ Notification sent successfully:', result);

    return new Response(JSON.stringify({
      success: true,
      message: 'Notification sent successfully',
      result: result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in whatsapp-send-notification:', error);
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