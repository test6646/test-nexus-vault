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

    // Get WhatsApp session for the firm
    const { data: sessionData, error: sessionError } = await supabase
      .from('wa_sessions')
      .select('session_data')
      .eq('firm_id', firmId)
      .maybeSingle();

    if (sessionError || !sessionData?.session_data) {
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
    const { data: backendUrlData, error: urlError } = await supabase.functions.invoke('get-backend-url');
    
    if (urlError) {
      console.error('Backend URL fetch error:', urlError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'WhatsApp service is currently unavailable. Please try again later or contact support.' 
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }
    
    const backendUrl = backendUrlData?.url || Deno.env.get('BACKEND_URL');

    if (!backendUrl) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'WhatsApp service is currently unavailable. Please try again later or contact support.' 
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Convert base64 to buffer
    const fileBuffer = Uint8Array.from(atob(file.data), c => c.charCodeAt(0));

    // Create form data for the backend request
    const formData = new FormData();
    formData.append('firmId', firmId); // CRITICAL: Include firmId so backend knows which WhatsApp to use
    formData.append('to', clientPhone);
    formData.append('message', message);
    formData.append('filename', file.name);
    formData.append('document', new Blob([fileBuffer], { type: file.type }), file.name);

    // Send to backend WhatsApp service
    console.log(`Sending document to backend: ${backendUrl}/whatsapp/send-document`);
    
    const response = await fetch(`${backendUrl}/whatsapp/send-document`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      }
    });

    console.log(`Backend response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error response:', errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'WhatsApp service is currently unavailable. Please try again later or contact support.' 
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }
    
    const result = await response.json();
    console.log('Backend success response:', result);

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