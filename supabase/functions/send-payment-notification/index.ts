import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters completely
  let cleanNumber = phone.replace(/\D/g, '');
  
  // If the number already starts with 91, ensure it's properly formatted
  if (cleanNumber.startsWith('91') && cleanNumber.length === 12) {
    return `+${cleanNumber}`;
  }
  
  // If number starts with 0, remove the leading 0
  if (cleanNumber.startsWith('0') && cleanNumber.length === 11) {
    cleanNumber = cleanNumber.substring(1);
  }
  
  // For 10-digit Indian numbers, add +91 prefix
  if (cleanNumber.length === 10) {
    return `+91${cleanNumber}`;
  }
  
  // If it's 12 digits and starts with 91, add the + prefix
  if (cleanNumber.length === 12 && cleanNumber.startsWith('91')) {
    return `+${cleanNumber}`;
  }
  
  // For any other case, try to format as Indian number
  // Take the last 10 digits and add +91
  if (cleanNumber.length > 10) {
    const lastTenDigits = cleanNumber.slice(-10);
    return `+91${lastTenDigits}`;
  }
  
  // Default fallback - add +91 to whatever we have
  return `+91${cleanNumber}`;
};
interface PaymentNotificationData {
  clientName: string;
  eventName: string;
  amountPaid: number;
  paymentMethod: string;
  remainingBalance: number;
  clientPhone: string;
  firmId: string; // CRITICAL: Added firmId for firm-specific WhatsApp sessions
  notificationType?: string;
  eventDate?: string;
  venue?: string;
}

const formatWhatsAppMessage = (data: PaymentNotificationData): string => {
  // Handle event cancellation notification
  if (data.notificationType === 'event_cancellation') {
    const eventDate = data.eventDate ? new Date(data.eventDate) : new Date();
    const dateFormatted = eventDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    return `**EVENT CANCELLED**

Dear *${data.clientName}*,

We wish to inform you that the following event has been cancelled at the client's request:

*Event:* ${data.eventName}
*Date:* ${dateFormatted}
*Venue:* ${data.venue || 'TBD'}

Our team will be in touch shortly to assist you with:
• Full refund process (if applicable)
• Rescheduling options
• Alternative arrangements

We appreciate your understanding and remain available for any support you may need.

Thank you for choosing *PRIT PHOTO*
*#aJourneyOfLoveByPritPhoto*
Contact: +91 72850 72603`;
  }

  // Regular payment notification
  const isFullyPaid = data.remainingBalance === 0;

  return `**PAYMENT RECEIVED**

Dear *${data.clientName}*,

We have successfully received your payment:

*Event:* ${data.eventName}
*Amount Paid:* ₹${data.amountPaid.toLocaleString()}
*Payment Method:* ${data.paymentMethod}
*Remaining Balance:* ${isFullyPaid ? 'Fully Paid' : `₹${data.remainingBalance.toLocaleString()}`}

Thank you for choosing *PRIT PHOTO*
*#aJourneyOfLoveByPritPhoto*
Contact: +91 72850 72603`;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📱 Payment notification request received');
    
    const requestData: PaymentNotificationData = await req.json();
    console.log('📋 Payment data:', { 
      clientName: requestData.clientName,
      eventName: requestData.eventName,
      amountPaid: requestData.amountPaid,
      remainingBalance: requestData.remainingBalance
    });

    // Get backend URL from environment
    const backendUrl = Deno.env.get('WHATSAPP_BACKEND_URL') || 'https://whatsapp-backend-n57s.onrender.com';
    console.log('🔗 Using backend URL:', backendUrl);

    // Format the WhatsApp message
    const whatsappMessage = formatWhatsAppMessage(requestData);
    console.log('📝 Formatted message length:', whatsappMessage.length);

    // Format phone number properly
    const formattedPhone = formatPhoneNumber(requestData.clientPhone);
    console.log('📞 Original phone:', requestData.clientPhone, '→ Formatted:', formattedPhone);

    // Send WhatsApp message with firmId for firm-specific session
    const whatsappResponse = await fetch(`${backendUrl}/api/whatsapp/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
        body: JSON.stringify({
          firmId: requestData.firmId, // CRITICAL: Pass firmId for firm-specific WhatsApp
          number: formattedPhone,
          message: whatsappMessage,
      }),
    });

    const whatsappResult = await whatsappResponse.json();

    if (!whatsappResponse.ok || !whatsappResult.success) {
      console.error('❌ WhatsApp send failed:', whatsappResult);
      throw new Error(whatsappResult.message || 'Failed to send WhatsApp message');
    }

    console.log('✅ WhatsApp message sent successfully:', whatsappResult.message);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Payment notification sent successfully',
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
    console.error('❌ Error in payment notification function:', error);
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