import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};



serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { eventData, staffList, clientData } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = {
      staff_notifications: [],
      client_notification: null,
      errors: []
    };

    // Send notifications to staff members using the same working pattern
    for (const staff of staffList) {
      try {
        
        const { error: notificationError } = await supabase.functions.invoke('send-staff-notification', {
          body: {
            staffName: staff.staff_name,
            staffPhone: staff.staff_phone,
            eventName: eventData.title,
            eventType: eventData.event_type || 'Wedding',
            eventDate: eventData.event_date,
            venue: eventData.venue || '~',
            clientName: staff.client_name,
            role: staff.role,
            firmId: eventData.firm_id, // CRITICAL: Pass firmId for firm-specific WhatsApp
            notificationType: 'event_staff_cancellation' // Use separate template for staff cancellations
          }
        });

        const notificationSent = !notificationError;
        
        if (notificationError) {
          // Failed to send notification
        } else {
          // Notification sent successfully
        }

        results.staff_notifications.push({
          staff_name: staff.staff_name,
          phone: staff.staff_phone,
          role: staff.role,
          notification_sent: notificationSent,
          method: notificationSent ? 'WhatsApp' : 'Failed'
        });

      } catch (error) {
        results.errors.push(`Failed to notify ${staff.staff_name}: ${error.message}`);
      }
    }

    // Send notification to client using the same working pattern
    if (clientData && clientData.phone) {
      try {
        
        const { error: notificationError } = await supabase.functions.invoke('send-payment-notification', {
          body: {
            clientName: clientData.name,
            eventName: eventData.title,
            amountPaid: 0, // Not relevant for cancellation
            paymentMethod: 'N/A',
            remainingBalance: 0,
            clientPhone: clientData.phone,
            firmId: eventData.firm_id, // CRITICAL: Pass firmId for firm-specific WhatsApp
            notificationType: 'event_cancellation',
            eventDate: eventData.event_date,
            venue: eventData.venue || '~'
          }
        });
        
        const clientNotificationSent = !notificationError;
        
        if (notificationError) {
          // Failed to send client notification
        } else {
          // Client notification sent successfully
        }
        
        results.client_notification = {
          client_name: clientData.name,
          phone: clientData.phone,
          notification_sent: clientNotificationSent,
          method: clientNotificationSent ? 'WhatsApp' : 'Failed'
        };

      } catch (error) {
        results.errors.push(`Failed to notify client: ${error.message}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Event deletion notifications processed',
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});