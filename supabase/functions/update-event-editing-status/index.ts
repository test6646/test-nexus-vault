
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventId, taskType, isCompleted } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine which editing status to update based on task type
    let updateData: any = { updated_at: new Date().toISOString() };
    
    if (taskType === 'Photo Editing') {
      updateData.photo_editing_status = isCompleted;
    } else if (taskType === 'Video Editing') {
      updateData.video_editing_status = isCompleted;
    } else {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Task type not related to editing status' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update the event editing status
    const { data: event, error: updateError } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId)
      .select('*, client:clients(name), firm:firms(spreadsheet_id)')
      .single();

    if (updateError) {
      throw updateError;
    }

    // Sync to Google Sheets if spreadsheet exists
    if (event.firm?.spreadsheet_id) {
      try {
        const { error: syncError } = await supabase.functions.invoke('sync-single-item-to-google', {
          body: {
            itemType: 'event',
            itemId: eventId,
            firmId: event.firm_id
          }
        });

        if (syncError) {
          // Warning only, don't fail the main operation
        } else {
          // Success
        }
      } catch (syncError) {
        // Warning only, don't fail the main operation
      }
    } else {
      // No spreadsheet configured
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: `Event ${taskType.toLowerCase()} status updated to ${isCompleted ? 'completed' : 'pending'}`,
      eventId,
      updatedField: taskType === 'Photo Editing' ? 'photo_editing_status' : 'video_editing_status',
      value: isCompleted,
      googleSheetsSync: event.firm?.spreadsheet_id ? 'attempted' : 'skipped'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
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
