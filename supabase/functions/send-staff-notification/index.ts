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
  staffPhone?: string;
  eventName?: string;
  taskTitle?: string;
  role?: string;
  eventDate?: string;
  eventEndDate?: string;
  dates?: string[]; // For availability checks with multiple dates
  venue?: string;
  clientName?: string;
  clientPhone?: string;
  eventType?: string;
  dayNumber?: number;
  totalDays?: number;
  amount?: number;
  paymentDate?: string;
  paymentMethod?: string;
  firmId?: string;
  updatedFields?: string[];
  customMessage?: string;
  notificationType: 'event_assignment' | 'event_unassignment' | 'task_assignment' | 'task_unassignment' | 'task_cancellation' | 'staff_work_assignment' | 'salary_payment' | 'event_cancellation' | 'event_staff_cancellation' | 'task_reported' | 'event_update' | 'staff_event_update' | 'task_update' | 'availability_check' | 'general_notification' | 'event_staff_notification';
}

const getNotificationSettings = async (firmId: string) => {
  const { data: sessionData } = await supabase
    .from('wa_sessions')
    .select('firm_name, firm_tagline, contact_info, footer_signature, notification_templates')
    .eq('firm_id', firmId)
    .single();

  // Firm fallback data - use new dedicated contact fields
  const { data: firm } = await supabase
    .from('firms')
    .select('name, tagline, description, contact_phone, contact_email, header_left_content, footer_content')
    .eq('id', firmId)
    .maybeSingle();

  // Generate proper contact info from dedicated fields
  const contactInfo = firm?.contact_phone || firm?.contact_email ? 
    `${firm?.contact_phone ? `Contact: ${firm.contact_phone}` : ''}\n${firm?.contact_email ? `Email: ${firm.contact_email}` : ''}`.trim() :
    firm?.header_left_content || '';

  return {
    firmName: sessionData?.firm_name || firm?.name || 'Studio',
    firmTagline: sessionData?.firm_tagline || firm?.tagline || firm?.description || 'Your memories, our passion',
    contactInfo: sessionData?.contact_info || contactInfo || '',
    footerSignature: sessionData?.footer_signature || (firm?.footer_content?.split('\n').pop() || ''),
    templates: sessionData?.notification_templates || {}
  };
};

const formatEventAssignmentMessage = async (data: StaffNotificationData): Promise<string> => {
  const settings = await getNotificationSettings(data.firmId || '');
  const template = settings.templates.event_assignment || {
    title: 'ASSIGNMENT',
    greeting: 'Dear *{staffName}*,',
    content: 'You are assigned as *{role}* for the following event:'
  };

  const eventDate = data.eventDate ? new Date(data.eventDate) : new Date();
  const startDateFormatted = eventDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  
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

  let assignmentContent = template.content.replace('{role}', data.role?.toUpperCase() || 'STAFF');
  if (data.dayNumber && data.totalDays && data.totalDays > 1) {
    assignmentContent = assignmentContent.replace(' for the following event:', ` on *DAY ${data.dayNumber}* for the following event:`);
  }

  return `*${template.title}*

${template.greeting.replace('{staffName}', data.staffName)}

${assignmentContent}

*Event:* ${data.eventName}
*Date:* ${dateDisplay}
*Venue:* ${data.venue || '~'}

Thank you for being part of *${settings.firmName}*
${settings.firmTagline}
${settings.contactInfo}
${settings.footerSignature}`;
};

const formatTaskAssignmentMessage = async (data: StaffNotificationData): Promise<string> => {
  const settings = await getNotificationSettings(data.firmId || '');
  const template = settings.templates.task_assignment || {
    title: 'TASK ASSIGNMENT',
    greeting: 'Dear *{staffName}*,',
    content: 'A new *{taskType}* task has been assigned to you:'
  };

  let taskType = 'OTHERS';
  if (data.taskTitle) {
    const title = data.taskTitle.toLowerCase();
    if (title.includes('photo') || title.includes('editing')) {
      taskType = 'PHOTO EDITING';
    } else if (title.includes('video')) {
      taskType = 'VIDEO EDITING';
    }
  }

  return `*${template.title}*

${template.greeting.replace('{staffName}', data.staffName)}

${template.content.replace('{taskType}', taskType)}

*Task:* ${data.taskTitle}
${data.eventName ? `*Related Event:* ${data.eventName}` : ''}
*Status:* Pending

Thank you for being part of *${settings.firmName}*
${settings.firmTagline}
${settings.contactInfo}
${settings.footerSignature}`;
};

const formatEventCancellationMessage = async (data: StaffNotificationData): Promise<string> => {
  const settings = await getNotificationSettings(data.firmId || '');
  const template = settings.templates.event_staff_cancellation || {
    title: 'EVENT CANCELLED',
    greeting: 'Dear *{staffName}*,',
    content: 'The following event has been cancelled:'
  };
  
  const eventDate = data.eventDate ? new Date(data.eventDate) : new Date();
  const dateFormatted = eventDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  });

  return `*${template.title}*

${template.greeting.replace('{staffName}', data.staffName)}

${template.content}

*Event:* ${data.eventName}
*Date:* ${dateFormatted}
*Venue:* ${data.venue || '~'}
*Your Role:* ${data.role}

Please note that you are no longer needed to make any preparations for this event.

Thank you for your understanding.

*${settings.firmName}*
${settings.firmTagline}
${settings.contactInfo}
${settings.footerSignature}`;
};

const formatSalaryPaymentMessage = async (data: StaffNotificationData): Promise<string> => {
  const settings = await getNotificationSettings(data.firmId || '');
  const template = settings.templates.salary_payment || {
    title: 'PAYMENT PROCESSED',
    greeting: 'Dear *{staffName}*,',
    content: 'Your salary payment has been processed:'
  };

  return `*${template.title}*

${template.greeting.replace('{staffName}', data.staffName)}

${template.content}

*Amount:* ₹${data.amount?.toLocaleString()}
*Payment Method:* ${data.paymentMethod}
${data.eventName ? `*Event:* ${data.eventName}` : ''}

Thank you for being part of *${settings.firmName}*
${settings.firmTagline}
${settings.contactInfo}
${settings.footerSignature}`;
};

const formatEventUnassignmentMessage = async (data: StaffNotificationData): Promise<string> => {
  const settings = await getNotificationSettings(data.firmId || '');
  const template = settings.templates.event_unassignment || {
    title: 'EVENT UNASSIGNMENT',
    greeting: 'Dear *{staffName}*,',
    content: 'You have been *UNASSIGNED* from the following event:'
  };

  const eventDate = data.eventDate ? new Date(data.eventDate) : new Date();
  const startDateFormatted = eventDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  
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

  let unassignmentContent = template.content;
  if (data.dayNumber && data.totalDays && data.totalDays > 1) {
    unassignmentContent = `You have been *UNASSIGNED* from *DAY ${data.dayNumber}* for the following event:`;
  }

  return `*${template.title}*

${template.greeting.replace('{staffName}', data.staffName)}

${unassignmentContent}

*Event:* ${data.eventName}
*Date:* ${dateDisplay}
*Past Role:* ${data.role}
*Venue:* ${data.venue || '~'}

Thank you for being part of *${settings.firmName}*
${settings.firmTagline}
${settings.contactInfo}
${settings.footerSignature}`;
};

const formatTaskUnassignmentMessage = async (data: StaffNotificationData): Promise<string> => {
  const settings = await getNotificationSettings(data.firmId || '');
  const template = settings.templates.task_unassignment || {
    title: 'TASK UNASSIGNMENT',
    greeting: 'Dear *{staffName}*,',
    content: 'You have been *UNASSIGNED* from the following task:'
  };

  let taskType = 'OTHERS';
  if (data.taskTitle) {
    const title = data.taskTitle.toLowerCase();
    if (title.includes('photo') || title.includes('editing')) {
      taskType = 'PHOTO EDITING';
    } else if (title.includes('video')) {
      taskType = 'VIDEO EDITING';
    }
  }

  return `*${template.title}*

${template.greeting.replace('{staffName}', data.staffName)}

${template.content}

*Task:* ${data.taskTitle}
${data.eventName ? `*Related Event:* ${data.eventName}` : ''}
*Status:* Unassigned

You are no longer needed to make any preparations for this task. Thank you for your availability.

Thank you for being part of *${settings.firmName}*
${settings.firmTagline}
${settings.contactInfo}
${settings.footerSignature}`;
};

const formatTaskReportedMessage = async (data: StaffNotificationData): Promise<string> => {
  const settings = await getNotificationSettings(data.firmId || '');
  const template = settings.templates.task_reported || {
    title: 'TASK REPORTED - ISSUES FOUND',
    greeting: 'Dear *{staffName}*,',
    content: 'Your submitted task has been reported due to issues:'
  };

  return `*${template.title}*

${template.greeting.replace('{staffName}', data.staffName)}

${template.content}

*Task:* ${data.taskTitle}
${data.eventName ? `*Related Event:* ${data.eventName}` : ''}
*Status:* *REPORTED*

Please review the task and restart it once you've addressed the concerns.

Thank you for being part of *${settings.firmName}*
${settings.firmTagline}
${settings.contactInfo}
${settings.footerSignature}`;
};

const formatTaskUpdateMessage = async (data: StaffNotificationData): Promise<string> => {
  const settings = await getNotificationSettings(data.firmId || '');
  const template = settings.templates.task_update || {
    title: 'TASK UPDATED',
    greeting: 'Dear *{staffName}*,',
    content: 'Your assigned task has been updated:'
  };

  return `*${template.title}*

${template.greeting.replace('{staffName}', data.staffName)}

${template.content}

*Task:* ${data.taskTitle}
${data.eventName ? `*Related Event:* ${data.eventName}` : ''}

Please check the updated task details and proceed accordingly.

Thank you for being part of *${settings.firmName}*
${settings.firmTagline}
${settings.contactInfo}
${settings.footerSignature}`;
};

const formatEventUpdateMessage = async (data: StaffNotificationData): Promise<string> => {
  const settings = await getNotificationSettings(data.firmId || '');
  const template = settings.templates.staff_event_update || {
    title: 'EVENT DETAILS UPDATED',
    greeting: 'Dear *{staffName}*,',
    content: 'The event you are assigned to has been updated:'
  };

  const eventDate = data.eventDate ? new Date(data.eventDate) : new Date();
  const dateFormatted = eventDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return `*${template.title}*

${template.greeting.replace('{staffName}', data.staffName)}

${template.content}

*Event:* ${data.eventName}
*Date:* ${dateFormatted}
*Venue:* ${data.venue || '~'}
*Your Role:* ${data.role || 'Staff'}

Please take note of these updated details for your preparations.

Thank you for being part of *${settings.firmName}*
${settings.firmTagline}
${settings.contactInfo}
${settings.footerSignature}`;
};

const formatAvailabilityCheckMessage = async (data: StaffNotificationData): Promise<string> => {
  const settings = await getNotificationSettings(data.firmId || '');
  const template = settings.templates.availability_check || {
    title: 'AVAILABILITY REQUEST',
    greeting: 'Dear *{staffName}*,',
    content: 'Please confirm your availability for the following dates:'
  };

  const datesFormatted = data.dates?.map(date => {
    const dateObj = new Date(date + 'T00:00:00');
    return dateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }).join(', ') || 'No dates specified';

  let message = `*${template.title}*

${template.greeting.replace('{staffName}', data.staffName)}

${template.content}

*Role Required:* ${data.role || 'Staff'}
*Dates:* ${datesFormatted}`;

  if (data.eventType) {
    message += `\n*Event Type:* ${data.eventType}`;
  }

  message += `\n\nPlease reply with your availability.`;

  if (data.customMessage?.trim()) {
    message += `\n\n*Additional Message:*\n${data.customMessage.trim()}`;
  }

  message += `\n\nThank you for being part of *${settings.firmName}*
${settings.firmTagline}
${settings.contactInfo}
${settings.footerSignature}`;

  return message;
};

const formatStaffWorkAssignmentMessage = async (data: StaffNotificationData): Promise<string> => {
  const settings = await getNotificationSettings(data.firmId || '');
  const template = settings.templates.event_staff_notification || {
    title: 'WORK ASSIGNMENT',
    greeting: 'Dear *{staffName}*,',
    content: 'You have specific work instructions for this event:'
  };

  let message = `*${template.title}*

${template.greeting.replace('{staffName}', data.staffName)}

${template.content}

*Work Details:*
${(data as any).workDetails || 'No details provided'}`;

  if (data.eventName) {
    message += `\n*Related Event:* ${data.eventName}`;
  }

  if (data.customMessage?.trim()) {
    message += `\n\n*Additional Message:*\n${data.customMessage.trim()}`;
  }

  message += `\n\nThank you for being part of *${settings.firmName}*
${settings.firmTagline}
${settings.contactInfo}
${settings.footerSignature}`;

  return message;
};

const formatGeneralNotificationMessage = async (data: StaffNotificationData): Promise<string> => {
  const settings = await getNotificationSettings(data.firmId || '');
  const template = settings.templates.event_staff_notification || {
    title: 'NOTIFICATION',
    greeting: 'Dear *{staffName}*,',
    content: 'You have a notification:'
  };
  
  const title = (data as any).notificationTitle || template.title;
  const content = (data as any).notificationContent || 'General notification';

  let message = `*${title}*

${template.greeting.replace('{staffName}', data.staffName)}

${template.content}

*Message:* ${content}`;

  if (data.customMessage?.trim()) {
    message += `\n\n*Additional Message:*\n${data.customMessage.trim()}`;
  }

  message += `

Thank you for being part of *${settings.firmName}*
${settings.firmTagline}
${settings.contactInfo}
${settings.footerSignature}`;

  return message;
};

const formatEventStaffNotificationMessage = async (data: StaffNotificationData): Promise<string> => {
  const settings = await getNotificationSettings(data.firmId || '');
  const template = settings.templates.event_staff_notification || {
    title: 'WORK ASSIGNMENT',
    greeting: 'Dear *{staffName}*,',
    content: 'You have specific work instructions for this event:'
  };

  const eventDate = data.eventDate ? new Date(data.eventDate) : new Date();
  const dateFormatted = eventDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  let message = `*${template.title}*

${template.greeting.replace('{staffName}', data.staffName)}

${template.content}

*Event:* ${data.eventName || 'Event Details'}
*Date:* ${dateFormatted}`;

  if (data.customMessage?.trim()) {
    message += `\n\n*Your Work Instructions:*\n${data.customMessage.trim()}`;
  }

  message += `\n\nPlease prepare accordingly for your specific responsibilities.

Thank you for being part of *${settings.firmName}*
${settings.firmTagline}
${settings.contactInfo}
${settings.footerSignature}`;

  return message;
};

const formatTaskCancellationMessage = async (data: StaffNotificationData): Promise<string> => {
  const settings = await getNotificationSettings(data.firmId || '');
  const template = settings.templates.task_cancellation || {
    title: 'TASK CANCELLED',
    greeting: 'Dear *{staffName}*,',
    content: 'The following task has been cancelled:'
  };

  let taskType = 'OTHERS';
  if (data.taskTitle) {
    const title = data.taskTitle.toLowerCase();
    if (title.includes('photo') || title.includes('editing')) {
      taskType = 'PHOTO EDITING';
    } else if (title.includes('video')) {
      taskType = 'VIDEO EDITING';
    }
  }

  return `*${template.title}*

${template.greeting.replace('{staffName}', data.staffName)}

${template.content}

*Task:* ${data.taskTitle}
${data.eventName ? `*Related Event:* ${data.eventName}` : ''}
*Task Type:* ${taskType}
*Status:* *CANCELLED*

You are no longer required to work on this task. Thank you for your availability.

Thank you for being part of *${settings.firmName}*
${settings.firmTagline}
${settings.contactInfo}
${settings.footerSignature}`;
};

const formatWhatsAppMessage = async (data: StaffNotificationData): Promise<string> => {
  switch (data.notificationType) {
    case 'event_assignment':
      return await formatEventAssignmentMessage(data);
    case 'event_unassignment':
      return await formatEventUnassignmentMessage(data);
    case 'task_assignment':
      return await formatTaskAssignmentMessage(data);
    case 'task_unassignment':
      return await formatTaskUnassignmentMessage(data);
    case 'task_cancellation':
      return await formatTaskCancellationMessage(data);
    case 'salary_payment':
      return await formatSalaryPaymentMessage(data);
    case 'event_cancellation':
    case 'event_staff_cancellation':
      return await formatEventCancellationMessage(data);
    case 'task_reported':
      return await formatTaskReportedMessage(data);
    case 'event_update':
    case 'staff_event_update':
      return await formatEventUpdateMessage(data);
    case 'task_update':
      return await formatTaskUpdateMessage(data);
    case 'availability_check':
      return await formatAvailabilityCheckMessage(data);
    case 'staff_work_assignment':
      return await formatStaffWorkAssignmentMessage(data);
    case 'general_notification':
      return await formatGeneralNotificationMessage(data);
    case 'event_staff_notification':
      return await formatEventStaffNotificationMessage(data);
    default:
      throw new Error('Invalid notification type');
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: StaffNotificationData = await req.json();
    console.log('📥 Request data:', {
      firmId: requestData.firmId,
      customMessage: requestData.customMessage,
      eventName: requestData.eventName,
      taskTitle: requestData.taskTitle
    });

    const backendUrl = Deno.env.get('BACKEND_URL');
    if (!backendUrl) {
      throw new Error('BACKEND_URL environment variable is not configured');
    }
    console.log('🔗 Using backend URL:', backendUrl);

    const whatsappMessage = await formatWhatsAppMessage(requestData);
    console.log('📝 Formatted message length:', whatsappMessage.length);

    let notificationSent = false;

      if (requestData.staffPhone) {
        try {
          const formattedPhone = formatPhoneNumber(requestData.staffPhone);

        const whatsappResponse = await fetch(backendUrl + '/api/whatsapp/send-message', {
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