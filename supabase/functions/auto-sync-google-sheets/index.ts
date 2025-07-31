import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// This edge function runs as a webhook to handle automatic Google Sheets syncing
// It will be triggered by database changes via the sync triggers

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔄 Auto-sync Google Sheets webhook triggered');
    
    // Get the sync data from the request
    const { itemType, itemId, firmId } = await req.json();
    
    if (!itemType || !itemId || !firmId) {
      console.error('❌ Missing required parameters for auto-sync');
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required parameters'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase configuration');
      return new Response(JSON.stringify({
        success: false,
        error: 'Server configuration error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Call the existing sync-single-item-to-google function
    console.log(`🚀 Auto-syncing ${itemType} ${itemId} to Google Sheets...`);
    
    const { data, error } = await supabase.functions.invoke('sync-single-item-to-google', {
      body: {
        itemType,
        itemId,
        firmId
      }
    });

    if (error) {
      console.error('❌ Auto-sync failed:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message || 'Auto-sync failed'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Auto-sync completed successfully:', data);
    
    return new Response(JSON.stringify({
      success: true,
      message: `${itemType} auto-synced to Google Sheets`,
      data
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Auto-sync error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unexpected auto-sync error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});