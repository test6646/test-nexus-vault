import { supabase } from '@/integrations/supabase/client';
import { BUSINESS_DEFAULTS } from '@/config/business-defaults';

interface WhatsAppShareData {
  clientName: string;
  clientPhone: string;
  eventType: string;
  documentType: 'quotation' | 'invoice';
  file: File;
  firmId: string;
  firmData?: {
    name: string;
    description?: string;
    tagline?: string;
    contact_phone?: string;
    contact_email?: string;
    header_left_content?: string;
    footer_content?: string;
  };
}

export const shareToClientWhatsApp = async (data: WhatsAppShareData) => {
  try {
    // Format the custom message using dynamic firm data or business defaults
    const firmName = data.firmData?.name || BUSINESS_DEFAULTS.FIRM_NAME;
    const firmTagline = data.firmData?.tagline || data.firmData?.description || BUSINESS_DEFAULTS.TAGLINE;
    const contactInfo = data.firmData?.contact_phone && data.firmData?.contact_email
      ? `Contact: ${data.firmData.contact_phone}\nEmail: ${data.firmData.contact_email}`
      : data.firmData?.header_left_content || `Contact: ${BUSINESS_DEFAULTS.CONTACT_PHONE}\nEmail: ${BUSINESS_DEFAULTS.CONTACT_EMAIL}`;
    
    // Create signature with actual firm name
    const signature = firmName !== BUSINESS_DEFAULTS.FIRM_NAME 
      ? `#aJourneyOfLoveBy${firmName.replace(/\s+/g, '')}`
      : BUSINESS_DEFAULTS.SIGNATURE;
    
    const message = `Dear ${data.clientName},

Please find your ${data.eventType} event related custom ${data.documentType} here. Thank you!

*${firmName}*
${contactInfo.replace(/\n/g, '\n')}

${firmTagline}
${signature}`;

    // Create the file data for WhatsApp API
    const fileData = {
      name: data.file.name,
      type: data.file.type,
      data: await fileToBase64(data.file)
    };

    // Call the WhatsApp edge function to send message with file
    const { data: result, error } = await supabase.functions.invoke('send-whatsapp-document', {
      body: {
        firmId: data.firmId,
        clientPhone: formatPhoneNumber(data.clientPhone),
        message: message,
        file: fileData
      }
    });

    if (error) {
      throw error;
    }

    if (!result || result.error) {
      throw new Error(result?.error || 'Failed to send WhatsApp message');
    }

    return { success: true, result };
  } catch (error: any) {
    console.error('Error sharing to WhatsApp:', error);
    const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
    
    // Check for specific WhatsApp session error
    if (errorMessage.includes('WhatsApp session not found') || errorMessage.includes('No active WhatsApp session found')) {
      return { 
        success: false, 
        error: 'WhatsApp is not connected for your firm. Please go to WhatsApp page and connect your WhatsApp first.' 
      };
    }
    
    // Check for backend URL error  
    if (errorMessage.includes('Backend URL not configured') || 
        errorMessage.includes('Edge Function returned a non-2xx status code') ||
        errorMessage.includes('FunctionsHttpError') ||
        errorMessage.includes('WhatsApp service is currently unavailable')) {
      return {
        success: false,
        error: 'WhatsApp service is currently unavailable. Please try again later or contact support.'
      };
    }
    
    return { success: false, error: errorMessage };
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove the data:mime/type;base64, prefix
      resolve(base64.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });
};

const formatPhoneNumber = (phone: string): string => {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove +91 prefix if exists and re-add it properly
  if (cleaned.startsWith('91') && cleaned.length > 10) {
    cleaned = cleaned.substring(2);
  }
  
  // If it starts with 0, remove it
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // If it's a 10-digit number, add 91
  if (cleaned.length === 10) {
    return '91' + cleaned;
  }
  
  // If it's already 12 digits starting with 91, return as is
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned;
  }
  
  return cleaned;
};
