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

interface StaffNotificationData {
  staffName: string;
  staffPhone: string;
  role: string;
  dates: string[];
  eventType?: string;
  customMessage?: string;
  firmId: string;
  notificationType: string;
  eventName?: string;
  eventVenue?: string;
  eventDate?: string;
  paymentAmount?: number;
  paymentMethod?: string;
  taskTitle?: string;
  taskType?: string;
  taskDescription?: string;
  taskDueDate?: string;
}

const formatStaffNotificationMessage = async (data: StaffNotificationData): Promise<string> => {
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

  // Clean message format based on notification type
  switch (data.notificationType) {
    case 'availability_check':
      const dateText = data.dates.length === 1 
        ? new Date(data.dates[0]).toLocaleDateString('en-GB')
        : `${data.dates.length} dates`;
      
      return `*AVAILABILITY CHECK*

Dear *${data.staffName}*,

We would like to check your availability for:

*Role:* ${data.role}
*Date(s):* ${dateText}
${data.eventType ? `*Event Type:* ${data.eventType}` : ''}
${data.customMessage ? `\n*Message:* ${data.customMessage}` : ''}

Please confirm your availability.

Thank you for being part of *${firmName}*
${firmTagline ? `_${firmTagline}_` : ''}
${contactInfo.join('\n')}`;

    case 'event_assignment':
      return `*ASSIGNMENT*

Dear *${data.staffName}*,

You are assigned as *${data.role}* for the following event:

*Event:* ${data.eventName}
*Date:* ${data.eventDate ? new Date(data.eventDate).toLocaleDateString('en-GB') : '~'}
*Venue:* ${data.eventVenue || '~'}

Thank you for being part of *${firmName}*
${firmTagline ? `_${firmTagline}_` : ''}
${contactInfo.join('\n')}`;

    case 'salary_payment':
      return `*PAYMENT PROCESSED*

Dear *${data.staffName}*,

Your salary payment has been processed:

*Amount:* ₹${data.paymentAmount?.toLocaleString()}
*Payment Method:* ${data.paymentMethod}
*Role:* ${data.role}

Thank you for being part of *${firmName}*
${firmTagline ? `_${firmTagline}_` : ''}
${contactInfo.join('\n')}`;

    case 'task_assignment':
      return `*TASK ASSIGNMENT*

Dear *${data.staffName}*,

A new *${data.taskType}* task has been assigned to you:

*Task:* ${data.taskTitle}
${data.taskDescription ? `*Description:* ${data.taskDescription}` : ''}
${data.taskDueDate ? `*Due Date:* ${new Date(data.taskDueDate).toLocaleDateString('en-GB')}` : ''}

Thank you for being part of *${firmName}*
${firmTagline ? `_${firmTagline}_` : ''}
${contactInfo.join('\n')}`;

    default:
      return `*NOTIFICATION*

Dear *${data.staffName}*,

${data.customMessage || 'You have a new notification.'}

Thank you for being part of *${firmName}*
${firmTagline ? `_${firmTagline}_` : ''}
${contactInfo.join('\n')}`;
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: StaffNotificationData = await req.json();

    const backendUrl = Deno.env.get('BACKEND_URL') || 'https://whatsapp-backend-n57s.onrender.com';
    
    if (!backendUrl) {
      throw new Error('BACKEND_URL environment variable is not configured');
    }

    const whatsappMessage = await formatStaffNotificationMessage(requestData);
    const formattedPhone = formatPhoneNumber(requestData.staffPhone);

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
        message: 'Staff notification sent successfully',
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