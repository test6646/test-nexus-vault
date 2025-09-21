import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useFirmData } from '@/hooks/useFirmData';
import { BUSINESS_DEFAULTS } from '@/config/business-defaults';

interface DynamicBrandingData {
  firmName: string;
  contactPhone: string;
  contactEmail: string;
  tagline: string;
  signature: string;
  description: string;
  headerLeftContent: string;
  footerContent: string;
}

export const useDynamicBranding = () => {
  const { currentFirmId } = useAuth();
  const { firmData, loading } = useFirmData();
  const [brandingData, setBrandingData] = useState<DynamicBrandingData>({
    firmName: BUSINESS_DEFAULTS.FIRM_NAME,
    contactPhone: BUSINESS_DEFAULTS.CONTACT_PHONE,
    contactEmail: BUSINESS_DEFAULTS.CONTACT_EMAIL,
    tagline: BUSINESS_DEFAULTS.TAGLINE,
    signature: BUSINESS_DEFAULTS.SIGNATURE,
    description: BUSINESS_DEFAULTS.TAGLINE,
    headerLeftContent: `Contact: ${BUSINESS_DEFAULTS.CONTACT_PHONE}\nEmail: ${BUSINESS_DEFAULTS.CONTACT_EMAIL}`,
    footerContent: `${BUSINESS_DEFAULTS.FIRM_NAME} | Contact: ${BUSINESS_DEFAULTS.CONTACT_PHONE} | Email: ${BUSINESS_DEFAULTS.CONTACT_EMAIL}\n${BUSINESS_DEFAULTS.TAGLINE} | ${BUSINESS_DEFAULTS.SIGNATURE}`
  });

  useEffect(() => {
    if (firmData && currentFirmId) {
      const finalContactPhone = (firmData as any).contact_phone || extractPhone(firmData.header_left_content) || BUSINESS_DEFAULTS.CONTACT_PHONE;
      const finalContactEmail = (firmData as any).contact_email || extractEmail(firmData.header_left_content) || BUSINESS_DEFAULTS.CONTACT_EMAIL;
      const finalTagline = (firmData as any).tagline || firmData.description || BUSINESS_DEFAULTS.TAGLINE;
      
      setBrandingData({
        firmName: firmData.name || BUSINESS_DEFAULTS.FIRM_NAME,
        contactPhone: finalContactPhone,
        contactEmail: finalContactEmail,
        tagline: finalTagline,
        signature: BUSINESS_DEFAULTS.SIGNATURE,
        description: finalTagline,
        headerLeftContent: firmData.header_left_content || `Contact: ${finalContactPhone}\nEmail: ${finalContactEmail}`,
        footerContent: firmData.footer_content || `${firmData.name || BUSINESS_DEFAULTS.FIRM_NAME} | Contact: ${finalContactPhone} | Email: ${finalContactEmail}\n${finalTagline} | ${BUSINESS_DEFAULTS.SIGNATURE}`
      });
    }
  }, [firmData, currentFirmId]);

  return {
    ...brandingData,
    loading,
    // Helper methods for common patterns
    getContactInfo: () => brandingData.headerLeftContent,
    getFullFooter: () => brandingData.footerContent,
    getWhatsAppSignature: () => `${brandingData.tagline}\n${brandingData.signature}`
  };
};

// Helper functions to extract phone and email from header content
const extractPhone = (headerContent?: string): string | null => {
  if (!headerContent) return null;
  const phoneMatch = headerContent.match(/(\+91\s?\d{5}\s?\d{5}|\+91\d{10})/);
  return phoneMatch ? phoneMatch[0] : null;
};

const extractEmail = (headerContent?: string): string | null => {
  if (!headerContent) return null;
  const emailMatch = headerContent.match(/[\w.-]+@[\w.-]+\.\w+/);
  return emailMatch ? emailMatch[0] : null;
};