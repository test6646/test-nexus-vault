import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const formatPhoneNumber = (phone: string): string => {
  let cleanNumber = phone.replace(/\D/g, '');
  
  if (cleanNumber.startsWith('91') && cleanNumber.length === 12) {
    return `+${cleanNumber}`;
  }
  
  if (cleanNumber.startsWith('0') && cleanNumber.length === 11) {
    cleanNumber = cleanNumber.substring(1);
  }
  
  if (cleanNumber.length === 10) {
    return `+91${cleanNumber}`;
  }
  
  if (cleanNumber.length === 12 && cleanNumber.startsWith('91')) {
    return `+${cleanNumber}`;
  }
  
  if (cleanNumber.length > 10) {
    const lastTenDigits = cleanNumber.slice(-10);
    return `+91${lastTenDigits}`;
  }
  
  return `+91${cleanNumber}`;
};

interface EventConfirmationData {
  clientName: string;
  clientPhone: string;
  eventName: string;
  eventDate: string;
  venue: string;
  totalAmount: number;
  firmId: string;
  totalDays?: number;
  eventEndDate?: string;
  isUpdate?: boolean;
  updatedFields?: string[];
}

const formatEventDateRange = (eventDate: string, totalDays: number = 1, eventEndDate?: string | null): string => {
  const startDate = new Date(eventDate);
  
  if (totalDays > 1) {
    const endDate = eventEndDate ? 
      new Date(eventEndDate) : 
      new Date(startDate.getTime() + (totalDays - 1) * 24 * 60 * 60 * 1000);
    return `${startDate.toLocaleDateString('en-GB')} - ${endDate.toLocaleDateString('en-GB')}`;
  }
  
  return startDate.toLocaleDateString('en-GB');
};

const formatEventConfirmationMessage = async (data: EventConfirmationData): Promise<string> => {
  const dateFormatted = formatEventDateRange(data.eventDate, data.totalDays, data.eventEndDate);

  // Get firm data - using only existing fields
  const { data: firm } = await supabase
    .from('firms')
    .select('name, tagline, contact_phone, contact_email')
    .eq('id', data.firmId)
    .maybeSingle();

  const firmName = firm?.name || 'Studio';
  const firmTagline = firm?.tagline || '';
  const contactInfo = [];
  if (firm?.contact_phone) contactInfo.push(`Contact: ${firm.contact_phone}`);
  if (firm?.contact_email) contactInfo.push(`Email: ${firm.contact_email}`);
  
  // Clean message format
  const title = data.isUpdate ? 'EVENT UPDATED' : 'EVENT CONFIRMED';
  const content = data.isUpdate ? 'Your event details have been updated:' : 'Your event has been successfully confirmed:';

  let messageContent = `*${title}*

Dear *${data.clientName}*,

${content}

*Event:* ${data.eventName}
*Date:* ${dateFormatted}
*Venue:* ${data.venue || '~'}`;

  // Only show amount for confirmations, not updates
  if (!data.isUpdate) {
    messageContent += `\n*Amount:* ₹${data.totalAmount.toLocaleString()}`;
  }

  // Add updated fields info for updates
  if (data.isUpdate && data.updatedFields && data.updatedFields.length > 0) {
    messageContent += `\n*Updated:* ${data.updatedFields.join(', ')}`;
  }

  messageContent += `

Thank you for choosing *${firmName}*
${firmTagline ? `_${firmTagline}_` : ''}
${contactInfo.join('\n')}`;

  return messageContent;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: EventConfirmationData = await req.json();

    const backendUrl = Deno.env.get('BACKEND_URL') || 'https://whatsapp-backend-n57s.onrender.com';
    
    // Validate backend URL is configured
    if (!backendUrl) {
      throw new Error('BACKEND_URL environment variable is not configured');
    }

    const whatsappMessage = await formatEventConfirmationMessage(requestData);

    const formattedPhone = formatPhoneNumber(requestData.clientPhone);

    const whatsappResponse = await fetch(`${backendUrl}/api/whatsapp/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firmId: requestData.firmId,
        number: formattedPhone,
        message: whatsappMessage,
      }),
    });

    const whatsappResult = await whatsappResponse.json();

    if (!whatsappResponse.ok || !whatsappResult.success) {
      const errorMsg = whatsappResult.message || `HTTP ${whatsappResponse.status}: Failed to send WhatsApp message`;
      throw new Error(errorMsg);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Event confirmation sent successfully',
        whatsappResult: whatsappResult.message
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
