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

const formatWhatsAppMessage = async (data: PaymentNotificationData): Promise<string> => {
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

  // Handle event cancellation notification
  if (data.notificationType === 'event_cancellation') {
    const eventDate = data.eventDate ? new Date(data.eventDate) : new Date();
    const dateFormatted = eventDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    return `*EVENT CANCELLED*

Dear *${data.clientName}*,

We wish to inform you that your following event has been cancelled at your request:

*Event:* ${data.eventName}
*Date:* ${dateFormatted}
*Venue:* ${data.venue || '~'}

Our team will be in touch shortly to assist you with:
• Full refund process (if applicable)
• Rescheduling options for future dates
• Alternative service arrangements

We appreciate your understanding and remain available for any support you may need. We look forward to serving you again in the future.

Thank you for choosing *${firmName}*
${firmTagline ? `_${firmTagline}_` : ''}
${contactInfo.join('\n')}`;
  }

  // Regular payment notification
  const isFullyPaid = data.remainingBalance === 0;

  return `*PAYMENT RECEIVED*

Dear *${data.clientName}*,

We have successfully received your payment:

*Event:* ${data.eventName}
*Amount Paid:* ₹${data.amountPaid.toLocaleString()}
*Payment Method:* ${data.paymentMethod}
*Remaining Balance:* ${isFullyPaid ? 'Fully Paid' : `₹${data.remainingBalance.toLocaleString()}`}

Thank you for choosing *${firmName}*
${firmTagline ? `_${firmTagline}_` : ''}
${contactInfo.join('\n')}`;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: PaymentNotificationData = await req.json();

    // Get backend URL from environment
    const backendUrl = Deno.env.get('BACKEND_URL') || 'https://whatsapp-backend-n57s.onrender.com';
    
    // Validate backend URL is configured
    if (!backendUrl) {
      throw new Error('BACKEND_URL environment variable is not configured');
    }

    // Format the WhatsApp message
    const whatsappMessage = await formatWhatsAppMessage(requestData);

    // Format phone number properly
    const formattedPhone = formatPhoneNumber(requestData.clientPhone);

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
      const errorMsg = whatsappResult.message || `HTTP ${whatsappResponse.status}: Failed to send WhatsApp message`;
      throw new Error(errorMsg);
    }

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
