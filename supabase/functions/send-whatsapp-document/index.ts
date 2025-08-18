import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppDocumentRequest {
  firmId: string;
  clientPhone: string;
  message: string;
  file: {
    name: string;
    type: string;
    data: string; // base64 data
  };
}

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

    const { firmId, clientPhone, message, file }: WhatsAppDocumentRequest = await req.json();

    console.log('WhatsApp document request:', { firmId, clientPhone, fileName: file.name });

    // Get WhatsApp session for the firm
    const { data: sessionData, error: sessionError } = await supabase
      .from('wa_sessions')
      .select('session_data')
      .eq('firm_id', firmId)
      .maybeSingle();

    if (sessionError || !sessionData?.session_data) {
      console.error('WhatsApp session not found:', sessionError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'WhatsApp session not found for this firm. Please connect WhatsApp first.' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Get backend URL
    const { data: backendUrlData } = await supabase.functions.invoke('get-backend-url');
    const backendUrl = backendUrlData?.url || Deno.env.get('BACKEND_URL');

    if (!backendUrl) {
      throw new Error('No active WhatsApp session found');
    }

    // Convert base64 to buffer
    const fileBuffer = Uint8Array.from(atob(file.data), c => c.charCodeAt(0));

    // Create form data for the backend request
    const formData = new FormData();
    formData.append('to', clientPhone);
    formData.append('message', message);
    formData.append('filename', file.name);
    formData.append('document', new Blob([fileBuffer], { type: file.type }), file.name);

    // Send to backend WhatsApp service
    const response = await fetch(`${backendUrl}/whatsapp/send-document`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send WhatsApp message');
    }

    console.log('WhatsApp document sent successfully:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        result,
        message: 'Document sent successfully via WhatsApp'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in send-whatsapp-document function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send WhatsApp document'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);