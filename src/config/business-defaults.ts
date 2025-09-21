/**
 * Centralized business configuration
 * This file contains default business information that can be overridden by firm settings
 */

export const BUSINESS_DEFAULTS = {
  FIRM_NAME: 'Stoodiora Studio',
  CONTACT_PHONE: '+91 91064 03233',
  CONTACT_EMAIL: 'team_stoodiora@gmail.com',
  TAGLINE: 'Studio Management System',
  SIGNATURE: '#PoweredByStoodiora'
} as const;

// Helper functions for templates
export const getContactInfo = (phone?: string, email?: string) => 
  `Contact: ${phone || BUSINESS_DEFAULTS.CONTACT_PHONE}\nEmail: ${email || BUSINESS_DEFAULTS.CONTACT_EMAIL}`;
  
export const getFooterContent = (firmName?: string, phone?: string, email?: string, tagline?: string, signature?: string) =>
  `${firmName || BUSINESS_DEFAULTS.FIRM_NAME} | Contact: ${phone || BUSINESS_DEFAULTS.CONTACT_PHONE} | Email: ${email || BUSINESS_DEFAULTS.CONTACT_EMAIL}\n${tagline || BUSINESS_DEFAULTS.TAGLINE} | ${signature || BUSINESS_DEFAULTS.SIGNATURE}`;

// Generate proper firm branding info from dedicated contact fields
export const generateFirmBranding = (firm: any) => {
  const firmName = firm?.name || BUSINESS_DEFAULTS.FIRM_NAME;
  const contactPhone = firm?.contact_phone || BUSINESS_DEFAULTS.CONTACT_PHONE;
  const contactEmail = firm?.contact_email || BUSINESS_DEFAULTS.CONTACT_EMAIL;
  const tagline = firm?.tagline || firm?.description || BUSINESS_DEFAULTS.TAGLINE;
  const signature = BUSINESS_DEFAULTS.SIGNATURE.replace('YOUR_FIRM_NAME', firmName.replace(/\s+/g, ''));

  return {
    firmName,
    contactPhone,
    contactEmail,
    tagline,
    signature,
    headerLeftContent: `Contact: ${contactPhone}\nEmail: ${contactEmail}`,
    footerContent: `${firmName} | Contact: ${contactPhone} | Email: ${contactEmail}\n${tagline} | ${signature}`
  };
};