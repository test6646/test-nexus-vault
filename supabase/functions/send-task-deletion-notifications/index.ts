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
    const { taskData, firmId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = {
      notification_sent: false,
      assignee_name: null,
      assignee_type: null,
      method: null,
      errors: []
    };

    // Send notification to assigned staff or freelancer
    if (taskData.assigned_to || taskData.freelancer_id) {
      try {
        let assigneeName = '';
        let assigneePhone = '';
        let assigneeType = '';

        if (taskData.freelancer_id) {
          // Get freelancer details
          const { data: freelancer } = await supabase
            .from('freelancers')
            .select('full_name, phone')
            .eq('id', taskData.freelancer_id)
            .single();

          if (freelancer) {
            assigneeName = freelancer.full_name;
            assigneePhone = freelancer.phone;
            assigneeType = 'Freelancer';
          }
        } else if (taskData.assigned_to) {
          // Get staff details
          const { data: staff } = await supabase
            .from('profiles')
            .select('full_name, mobile_number')
            .eq('id', taskData.assigned_to)
            .single();

          if (staff) {
            assigneeName = staff.full_name;
            assigneePhone = staff.mobile_number;
            assigneeType = 'Staff';
          }
        }

        if (assigneeName && assigneePhone) {
          const { error: notificationError } = await supabase.functions.invoke('send-staff-notification', {
            body: {
              staffName: assigneeName,
              staffPhone: assigneePhone,
              taskTitle: taskData.title,
              eventName: taskData.event?.title || 'N/A',
              taskType: taskData.task_type || 'Task',
              priority: taskData.priority || 'Medium',
              firmId: firmId,
              notificationType: 'task_cancellation'
            }
          });

          const notificationSent = !notificationError;
          
          results.notification_sent = notificationSent;
          results.assignee_name = assigneeName;
          results.assignee_type = assigneeType;
          results.method = notificationSent ? 'WhatsApp' : 'Failed';

          if (notificationError) {
            results.errors.push(`Failed to notify ${assigneeName}: ${notificationError.message}`);
          }
        } else {
          results.errors.push('Assignee contact information not found');
        }

      } catch (error) {
        results.errors.push(`Failed to send notification: ${error.message}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Task deletion notifications processed',
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