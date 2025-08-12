import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

const formatEventConfirmationMessage = (data: EventConfirmationData): string => {
  const dateFormatted = formatEventDateRange(data.eventDate, data.totalDays, data.eventEndDate);

  return `**EVENT CONFIRMED**

Dear *${data.clientName}*,

Your event has been successfully confirmed:

*Event:* ${data.eventName}
*Date:* ${dateFormatted}
*Venue:* ${data.venue}
*Amount:* ₹${data.totalAmount.toLocaleString()}

Thank you for choosing *PRIT PHOTO*
*#aJourneyOfLoveByPritPhoto*
Contact: +91 72850 72603`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📅 Event confirmation notification request received');
    
    const requestData: EventConfirmationData = await req.json();
    console.log('📋 Event data:', { 
      clientName: requestData.clientName,
      eventName: requestData.eventName,
      eventDate: requestData.eventDate,
      totalAmount: requestData.totalAmount
    });

    const backendUrl = Deno.env.get('WHATSAPP_BACKEND_URL') || 'https://whatsapp-backend-n57s.onrender.com';
    console.log('🔗 Using backend URL:', backendUrl);

    const whatsappMessage = formatEventConfirmationMessage(requestData);
    console.log('📝 Formatted message length:', whatsappMessage.length);

    const formattedPhone = formatPhoneNumber(requestData.clientPhone);
    console.log('📞 Original phone:', requestData.clientPhone, '→ Formatted:', formattedPhone);

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
      console.error('❌ WhatsApp send failed:', whatsappResult);
      throw new Error(whatsappResult.message || 'Failed to send WhatsApp message');
    }

    console.log('✅ Event confirmation sent successfully:', whatsappResult.message);

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
    console.error('❌ Error in event confirmation function:', error);
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