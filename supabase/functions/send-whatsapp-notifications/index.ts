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
    const { type, data, firm_id } = await req.json();
    
    console.log('📱 WhatsApp notification request:', { type, firm_id });

    if (!type || !data || !firm_id) {
      throw new Error('Missing required fields: type, data, and firm_id');
    }

    // Get WhatsApp session for this firm
    const { data: session, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('firm_id', firm_id)
      .eq('status', 'ready')
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

    const RAILWAY_URL = Deno.env.get('RAILWAY_WHATSAPP_URL') || 'https://railway-whatsapp-service-production-e337.up.railway.app';
    let endpoint = '';
    let payload = {};

    switch (type) {
      case 'event':
        endpoint = '/api/send-event-messages';
        
        // Get staff list for the event
        const { data: staffList, error: staffError } = await supabase
          .from('profiles')
          .select('id, full_name, mobile_number')
          .eq('firm_id', firm_id)
          .neq('role', 'Admin');

        if (staffError || !staffList) {
          throw new Error('Failed to get staff list');
        }

        // Get event staff assignments
        const { data: assignments, error: assignmentsError } = await supabase
          .from('event_staff_assignments')
          .select('*')
          .eq('event_id', data.id);

        payload = {
          event: data,
          staff_list: staffList,
          staff_assignments: assignments || [],
          firmId: firm_id
        };
        break;
      
      case 'task':
        endpoint = '/api/send-task-messages';
        
        // Get assigned staff member details
        const { data: assignedStaff, error: staffDetailError } = await supabase
          .from('profiles')
          .select('id, full_name, mobile_number')
          .eq('user_id', data.assigned_to)
          .single();

        if (staffDetailError || !assignedStaff) {
          throw new Error('Failed to get assigned staff details');
        }

        payload = {
          task: data,
          staff_list: [assignedStaff],
          firmId: firm_id
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
    console.error('❌ Error in send-whatsapp-notifications:', error);
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