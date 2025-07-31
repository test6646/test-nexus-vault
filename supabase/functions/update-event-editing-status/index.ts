
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
    console.log('🎯 Updating event editing status:', { eventId, taskType, isCompleted });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine which editing status to update based on task type
    let updateData: any = { updated_at: new Date().toISOString() };
    
    if (taskType === 'Photo Editing') {
      updateData.photo_editing_status = isCompleted;
      console.log('📸 Updating photo editing status to:', isCompleted);
    } else if (taskType === 'Video Editing') {
      updateData.video_editing_status = isCompleted;
      console.log('🎥 Updating video editing status to:', isCompleted);
    } else {
      console.log('⚠️ Task type not related to editing status:', taskType);
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
      console.error('❌ Error updating event:', updateError);
      throw updateError;
    }

    console.log(`✅ Event editing status updated: ${taskType} = ${isCompleted}`);

    // Sync to Google Sheets if spreadsheet exists
    if (event.firm?.spreadsheet_id) {
      console.log('📊 Syncing event to Google Sheets...');
      try {
        const { error: syncError } = await supabase.functions.invoke('sync-single-item-to-google', {
          body: {
            itemType: 'event',
            itemId: eventId,
            firmId: event.firm_id
          }
        });

        if (syncError) {
          console.error('⚠️ Warning: Failed to sync to Google Sheets:', syncError);
        } else {
          console.log('✅ Event synced to Google Sheets successfully');
        }
      } catch (syncError) {
        console.error('⚠️ Warning: Google Sheets sync failed:', syncError);
      }
    } else {
      console.log('📊 No spreadsheet configured for this firm, skipping Google Sheets sync');
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
    console.error('💥 Error in update-event-editing-status:', error);
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
