import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { firmId }: { firmId: string } = await req.json();

    if (!firmId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'firmId is required' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Get firm information
    const { data: firmData, error: firmError } = await supabase
      .from('firms')
      .select('name, description, header_left_content, footer_content')
      .eq('id', firmId)
      .single();

    if (firmError || !firmData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Firm not found or error fetching firm data' 
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Update wa_sessions with firm information
    const { error: updateError } = await supabase
      .from('wa_sessions')
      .update({
        firm_name: firmData.name,
        firm_tagline: firmData.description || '',
        contact_info: firmData.header_left_content || '',
        footer_signature: firmData.footer_content || '',
        updated_at: new Date().toISOString()
      })
      .eq('firm_id', firmId);

    if (updateError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to update WhatsApp session with firm info' 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'WhatsApp session updated with firm information',
        firmInfo: {
          firm_name: firmData.name,
          firm_tagline: firmData.description || '',
          contact_info: firmData.header_left_content || '',
          footer_signature: firmData.footer_content || ''
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to update WhatsApp firm info'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);