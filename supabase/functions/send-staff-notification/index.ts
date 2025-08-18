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

interface StaffNotificationData {
  staffName: string;
  staffPhone?: string;
  eventName?: string;
  taskTitle?: string;
  role?: string;
  eventDate?: string;
  eventEndDate?: string;
  venue?: string;
  clientName?: string;
  clientPhone?: string;
  eventType?: string;
  dayNumber?: number;
  totalDays?: number;
  amount?: number;
  paymentDate?: string;
  paymentMethod?: string;
  firmId?: string; // CRITICAL: Added firmId for firm-specific WhatsApp sessions
  notificationType: 'event_assignment' | 'task_assignment' | 'salary_payment' | 'event_cancellation' | 'task_reported';
}

const formatEventAssignmentMessage = (data: StaffNotificationData): string => {
  const eventDate = data.eventDate ? new Date(data.eventDate) : new Date();
  
  // Format start date
  const startDateFormatted = eventDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  
  // Calculate and format date range for multi-day events
  let dateDisplay = startDateFormatted;
  if (data.totalDays && data.totalDays > 1) {
    const endDate = new Date(eventDate);
    endDate.setDate(eventDate.getDate() + data.totalDays - 1);
    const endDateFormatted = endDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    dateDisplay = `${startDateFormatted} - ${endDateFormatted}`;
  }

  // Build title with role and day info
  let assignmentTitle = `You are assigned as **${data.role?.toUpperCase()}**`;
  if (data.dayNumber && data.totalDays && data.totalDays > 1) {
    assignmentTitle += ` on **DAY ${data.dayNumber}**`;
  }
  assignmentTitle += ' for the following event:';

  return `**ASSIGNMENT**

Dear *${data.staffName}*,

${assignmentTitle}

*Event:* ${data.eventName}
*Date:* ${dateDisplay}
*Venue:* ${data.venue || 'TBD'}

Thank you for being part of *PRIT PHOTO*
_#aJourneyOfLoveByPritPhoto_
+91 72850 72603`;
};

const formatTaskAssignmentMessage = (data: StaffNotificationData): string => {
  // Determine task type for title
  let taskType = 'OTHERS';
  if (data.taskTitle) {
    const title = data.taskTitle.toLowerCase();
    if (title.includes('photo') || title.includes('editing')) {
      taskType = 'PHOTO EDITING';
    } else if (title.includes('video')) {
      taskType = 'VIDEO EDITING';
    }
  }

  return `**TASK ASSIGNMENT**

Dear *${data.staffName}*,

A new **${taskType}** task has been assigned to you:

*Task:* ${data.taskTitle}
${data.eventName ? `*Related Event:* ${data.eventName}` : ''}
*Status:* Pending

Thank you for being part of *PRIT PHOTO*
_#aJourneyOfLoveByPritPhoto_
+91 72850 72603`;
};

const formatEventCancellationMessage = (data: StaffNotificationData): string => {
  const eventDate = data.eventDate ? new Date(data.eventDate) : new Date();
  const dateFormatted = eventDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  });

  return `**EVENT CANCELLED**

Dear *${data.staffName}*,

We wish to inform you that the following event has been cancelled due to client request:

*Event:* ${data.eventName}
*Date:* ${dateFormatted}
*Client:* ${data.clientName || 'N/A'}
*Your Role:* **${data.role}**
*Venue:* ${data.venue || 'TBD'}

We sincerely apologize for any inconvenience this may cause. Our team will reach out to you soon regarding compensation or future opportunities.

Thank you for being part of *PRIT PHOTO*
_#aJourneyOfLoveByPritPhoto_
+91 72850 72603`;
};

const formatSalaryPaymentMessage = (data: StaffNotificationData): string => {
  return `**PAYMENT PROCESSED**

Dear *${data.staffName}*,

Your salary payment has been processed:

*Amount:* ₹${data.amount?.toLocaleString()}
*Payment Method:* ${data.paymentMethod}
${data.eventName ? `*Event:* ${data.eventName}` : ''}

Thank you for being part of *PRIT PHOTO*
_#aJourneyOfLoveByPritPhoto_
+91 72850 72603`;
};

const formatTaskReportedMessage = (data: StaffNotificationData): string => {
  return `**TASK REPORTED - ISSUES FOUND**

Dear *${data.staffName}*,

Your submitted task has been reported due to issues:

*Task:* ${data.taskTitle}
${data.eventName ? `*Related Event:* ${data.eventName}` : ''}
*Status:* **REPORTED**

Please review the task and restart it once you've addressed the concerns.

Thank you for being part of *PRIT PHOTO*
_#aJourneyOfLoveByPritPhoto_
+91 72850 72603`;
};

const formatWhatsAppMessage = (data: StaffNotificationData): string => {
  switch (data.notificationType) {
    case 'event_assignment':
      return formatEventAssignmentMessage(data);
    case 'task_assignment':
      return formatTaskAssignmentMessage(data);
    case 'salary_payment':
      return formatSalaryPaymentMessage(data);
    case 'event_cancellation':
      return formatEventCancellationMessage(data);
    case 'task_reported':
      return formatTaskReportedMessage(data);
    default:
      throw new Error('Invalid notification type');
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📱 Staff notification request received');
    
    const requestData: StaffNotificationData = await req.json();
    console.log('📋 Notification data:', { 
      staffName: requestData.staffName,
      notificationType: requestData.notificationType,
      eventName: requestData.eventName,
      taskTitle: requestData.taskTitle
    });

    // Get backend URL from environment
    const backendUrl = Deno.env.get('WHATSAPP_BACKEND_URL') || 'https://whatsapp-backend-n57s.onrender.com';
    console.log('🔗 Using backend URL:', backendUrl);

    // Format the WhatsApp message
    const whatsappMessage = formatWhatsAppMessage(requestData);
    console.log('📝 Formatted message length:', whatsappMessage.length);

    let notificationSent = false;

    // Try WhatsApp notification if phone number is available
    if (requestData.staffPhone) {
      try {
        const formattedPhone = formatPhoneNumber(requestData.staffPhone);
        console.log('📞 Original phone:', requestData.staffPhone, '→ Formatted:', formattedPhone);

        const whatsappResponse = await fetch(backendUrl + '/api/whatsapp/send-message', {
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

        if (whatsappResponse.ok && whatsappResult.success) {
          console.log('✅ WhatsApp message sent successfully:', whatsappResult.message);
          notificationSent = true;
        } else {
          console.warn('⚠️ WhatsApp send failed:', whatsappResult);
        }
      } catch (whatsappError) {
        console.warn('⚠️ WhatsApp notification failed:', whatsappError);
      }
    }


    if (!notificationSent) {
      console.warn('⚠️ No notifications could be sent - missing contact info');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No valid contact information available for notification' 
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Staff notification sent successfully'
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
    console.error('❌ Error in staff notification function:', error);
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