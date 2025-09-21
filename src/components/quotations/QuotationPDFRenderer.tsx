import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { shareTextWithFile } from '@/lib/share-utils';
import { SharedPDFHeader, SharedPDFFooter, sharedStyles, SimpleTable } from '../pdf/SharedPDFLayout';
import { formatDate } from '@/lib/date-utils';
import { supabase } from '@/integrations/supabase/client';

const styles = StyleSheet.create({
  ...sharedStyles,
  tableTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#c4b28d',
    marginBottom: 10,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  dayHeaderRow: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#c4b28d',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 0,
    marginBottom: 0,
  },
  dayHeaderText: {
    fontSize: 11,
    fontWeight: 700,
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  seamlessTable: {
    marginVertical: 12,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  seamlessTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#c4b28d',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 0,
  },
  seamlessTableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#ffffff',
    marginBottom: 0,
  },
  seamlessTableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 0,
  },
  addOnGrid: {
    flexDirection: 'column',
    marginTop: 10,
  },
  addOnGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  addOnGridCell: {
    flex: 1,
    fontSize: 9,
    color: '#333333',
    textAlign: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#f8f9f9',
    marginHorizontal: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tableCellLeft: {
    fontSize: 9,
    color: '#333333',
    paddingHorizontal: 6,
    paddingVertical: 4,
    textAlign: 'left',
  },
  tableCellCenter: {
    fontSize: 9,
    color: '#333333',
    paddingHorizontal: 6,
    paddingVertical: 4,
    textAlign: 'center',
  },
  tableCellBold: {
    fontSize: 9,
    fontWeight: 700,
    color: '#333333',
    paddingHorizontal: 6,
    paddingVertical: 4,
    textAlign: 'left',
  },
  addonDescription: {
    fontSize: 7,
    color: '#888888',
    paddingHorizontal: 6,
    paddingVertical: 2,
    textAlign: 'left',
    fontStyle: 'italic',
  },
  totalSection: {
    marginTop: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  totalBox: {
    backgroundColor: '#f8f6f1',
    padding: 15,
    borderRadius: 8,
    width: 320,
    borderWidth: 2,
    borderColor: '#c4b28d',
    alignItems: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    width: '100%',
  },
  totalLabel: {
    fontSize: 10,
    color: '#555555',
    fontWeight: 600,
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 700,
    color: '#333333',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#c4b28d',
    paddingTop: 10,
    width: '100%',
  },
  grandTotal: {
    fontSize: 14,
    fontWeight: 700,
    color: '#c4b28d',
  },
  termsSection: {
    marginTop: 25,
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  termsTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#c4b28d',
    marginBottom: 10,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  termItem: {
    fontSize: 9,
    color: '#555555',
    marginBottom: 5,
    fontWeight: 400,
    lineHeight: 1.4,
  },
  // Second page styles (no header)
  secondPage: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Lexend',
    fontSize: 10,
    lineHeight: 1.4,
  },
});

interface QuotationPDFProps {
  quotation: any;
  firmData?: {
    name: string;
    description?: string;
    logo_url?: string;
    header_left_content?: string;
    footer_content?: string;
  };
}

const QuotationPDFDocument: React.FC<QuotationPDFProps> = ({ quotation, firmData }) => {
  const details = quotation.quotation_details 
    ? (typeof quotation.quotation_details === 'string' 
        ? JSON.parse(quotation.quotation_details) 
        : quotation.quotation_details)
    : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <SharedPDFHeader firmData={firmData} />

        <View>
          <Text style={styles.documentId}>Quote ID: {quotation.id || `QT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`}</Text>
          <Text style={styles.title}>QUOTATION</Text>
        </View>


        {/* Details Section */}
        <View style={styles.detailsContainer}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Client Information</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Client Name:</Text>
              <Text style={styles.detailValue}>{quotation.client?.name || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone:</Text>
              <Text style={styles.detailValue}>{quotation.client?.phone || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email:</Text>
              <Text style={styles.detailValue}>{quotation.client?.email || 'N/A'}</Text>
            </View>
          </View>
          
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Event Information</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Quote Date:</Text>
              <Text style={styles.detailValue}>{formatDate(new Date())}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Event Type:</Text>
              <Text style={styles.detailValue}>{quotation.event_type}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Event Date:</Text>
              <Text style={styles.detailValue}>
                {(() => {
                  const quotationDetails = quotation.quotation_details as any;
                  const days = quotationDetails?.days || [];
                  const totalDays = days.length || 1;
                  // Fix: Create date object properly by adding 'T00:00:00' to avoid timezone issues
                  const eventDateStr = quotation.event_date.includes('T') 
                    ? quotation.event_date 
                    : `${quotation.event_date}T00:00:00`;
                  const startDate = new Date(eventDateStr);
                  
                  if (totalDays === 1) {
                    return formatDate(startDate);
                  } else {
                    // Create end date by adding days without timezone issues
                    const endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + totalDays - 1);
                    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
                  }
                })()}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Venue:</Text>
              <Text style={styles.detailValue}>{quotation.venue || '~'}</Text>
            </View>
            {quotation.description && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Description:</Text>
                <Text style={styles.detailValue}>{quotation.description}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Service Breakdown Table - FIRST PAGE */}
        {details?.days && details.days.length > 0 && (
          <View>
            <Text style={styles.tableTitle}>SERVICE BREAKDOWN</Text>
            <View style={styles.seamlessTable}>
              {/* Table Header */}
              <View style={styles.seamlessTableHeader}>
                <Text style={styles.tableCellHeader}>Service</Text>
                <Text style={styles.tableCellHeader}>Count</Text>
                <Text style={styles.tableCellHeader}>Description</Text>
              </View>
              
              {/* Service Data with Custom Day Headers */}
              {details.days.map((day: any, dayIndex: number) => (
                <View key={dayIndex}>
                  {/* Custom Day Header Row - Spans All Columns */}
                  <View style={styles.dayHeaderRow}>
                    <Text style={styles.dayHeaderText}>{day.name}</Text>
                  </View>
                  
                  {/* Service Rows for this Day */}
                  {day.photographers > 0 && (
                    <View style={styles.seamlessTableRow}>
                      <Text style={styles.tableCell}>  • Photographers</Text>
                      <Text style={styles.tableCell}>{day.photographers}</Text>
                      <Text style={styles.tableCell}>Professional Photography Coverage</Text>
                    </View>
                  )}
                  {day.cinematographers > 0 && (
                    <View style={styles.seamlessTableRow}>
                      <Text style={styles.tableCell}>  • Cinematography</Text>
                      <Text style={styles.tableCell}>{day.cinematographers}</Text>
                      <Text style={styles.tableCell}>Professional Cinematography Coverage</Text>
                    </View>
                  )}
                  {day.drone > 0 && (
                    <View style={styles.seamlessTableRow}>
                      <Text style={styles.tableCell}>  • Drone Coverage</Text>
                      <Text style={styles.tableCell}>{day.drone}</Text>
                      <Text style={styles.tableCell}>Aerial Photography & Videography</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Add-ons Table - FIRST PAGE */}
        {details?.addOns && details.addOns.length > 0 && (
          <View>
            <Text style={styles.tableTitle}>ADDITIONAL SERVICES</Text>
            <SimpleTable
              headers={['Service', 'Count', 'Description']}
              rows={details.addOns.map((addOn: any) => [
                addOn.name,
                `${addOn.quantity || 1}${addOn.unit ? ` ${addOn.unit}` : ''}`,
                addOn.description || 'Premium add-on service'
              ])}
            />
          </View>
        )}
      </Page>

      {/* SECOND PAGE - NO HEADER */}
      <Page size="A4" style={styles.secondPage}>
        {/* Post-production Services - SECOND PAGE */}
        {details?.postProductionItems && details.postProductionItems.length > 0 && (
          <View>
            <Text style={styles.tableTitle}>POST-PRODUCTION SERVICES INCLUDED</Text>
            <SimpleTable
              headers={['Service Details', 'Status']}
              rows={details.postProductionItems.map((item: string) => [
                `✓ ${item.replace(/1/g, '1').replace(/₹/g, 'Rs.')}`,
                'Included'
              ])}
            />
          </View>
        )}

        {/* Available Add-ons - 3x3 Grid Format */}
        <View>
          <Text style={styles.tableTitle}>AVAILABLE ADD-ONS</Text>
          <View style={styles.addOnGrid}>
            <View style={styles.addOnGridRow}>
              <Text style={styles.addOnGridCell}>1 Day Drone Coverage</Text>
              <Text style={styles.addOnGridCell}>Live HD Setup</Text>
              <Text style={styles.addOnGridCell}>Side 10x20 LED Wall</Text>
            </View>
            <View style={styles.addOnGridRow}>
              <Text style={styles.addOnGridCell}>2 Days Pre Wedding</Text>
              <Text style={styles.addOnGridCell}>Background LED</Text>
              <Text style={styles.addOnGridCell}>Album Page LED Wall</Text>
            </View>
            <View style={styles.addOnGridRow}>
              <Text style={styles.addOnGridCell}>1 Day Pre Wedding</Text>
              <Text style={styles.addOnGridCell}>1 Day Pre Photoshot</Text>
              <Text style={styles.addOnGridCell}>Full Length Film 3/4 Hour</Text>
            </View>
          </View>
        </View>

        {/* Total Section - AFTER POST-PRODUCTION AND BEFORE TERMS */}
        <View style={styles.totalSection}>
          <View style={styles.totalBox}>
            {quotation.discount_type && quotation.discount_value && (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Original Amount:</Text>
                  <Text style={[styles.totalValue, { textDecoration: 'line-through', color: '#888888' }]}>Rs.{quotation.amount.toLocaleString()}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Discount ({quotation.discount_type === 'percentage' ? `${quotation.discount_value}%` : `Rs.${quotation.discount_value.toLocaleString()}`}):</Text>
                  <Text style={[styles.totalValue, { color: '#e74c3c' }]}>-Rs.{quotation.discount_amount.toLocaleString()}</Text>
                </View>
              </>
            )}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotal}>TOTAL PACKAGE COST:</Text>
              <Text style={styles.grandTotal}>Rs.{(quotation.discount_type && quotation.discount_value ? quotation.amount - quotation.discount_amount : quotation.amount).toLocaleString()}</Text>
            </View>
          </View>
        </View>

      </Page>

      {/* Page 2: Terms and Conditions */}
      <Page size="A4" style={styles.page}>
        {/* Header - with firm data */}
        <SharedPDFHeader firmData={firmData} />

        {/* Terms and Conditions */}
        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>TERMS & CONDITIONS</Text>
          <Text style={styles.termItem}>• To confirm your booking, a 50% advance payment is required via bank transfer or cheque. The remaining 50% must be paid as 30% before the shoot and 20% at the time of final deliverables.</Text>
          <Text style={styles.termItem}>• This proposal is valid for 30 days from the date mentioned.</Text>
          <Text style={styles.termItem}>• Advance payments are non-refundable in case of cancellation, as your dates are blocked.</Text>
          <Text style={styles.termItem}>• We are not responsible for technical issues during the shoot or in the final output.</Text>
          <Text style={styles.termItem}>• All data is handled digitally. We are not liable for any data loss due to digital errors.</Text>
          <Text style={styles.termItem}>• Data backups are kept for 3 months after final delivery.</Text>
          <Text style={styles.termItem}>• We may use selected images from your event for our portfolio or promotions.</Text>
          <Text style={styles.termItem}>• One round of editing is included. Additional changes will be chargeable, so please share all edits at once.</Text>
        </View>

        {/* Footer */}
        <SharedPDFFooter firmData={firmData} />
      </Page>
    </Document>
  );
};

export const generateQuotationPDF = async (quotation: any) => {
  try {
    // Get firm data using localStorage firm ID with proper user-specific fallbacks
    let firmData = null;
    try {
      // Try to get current user and their firm
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Try multiple ways to get firm ID
        const userFirmKey = `selectedFirmId_${user.id}`;
        let firmId = localStorage.getItem(userFirmKey) || localStorage.getItem('selectedFirmId');
        
        // If no localStorage, try getting from profile
        if (!firmId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('current_firm_id, firm_id')
            .eq('user_id', user.id)
            .single();
          
          firmId = profile?.current_firm_id || profile?.firm_id;
        }
        
        if (firmId) {
          console.log('Fetching firm data for Quotation PDF with ID:', firmId);
          const { data: firm, error } = await supabase
            .from('firms')
            .select('name, description, logo_url, header_left_content, footer_content')
            .eq('id', firmId)
            .single();
          
          if (error) {
            console.error('Supabase error fetching firm data:', error);
          } else {
            console.log('Successfully fetched firm data:', firm);
            firmData = firm;
          }
        } else {
          console.warn('No firm ID found for Quotation PDF generation');
        }
      }
    } catch (error) {
      console.error('Error fetching firm data for Quotation PDF:', error);
    }
    
    console.log('Final firmData for Quotation PDF:', firmData);

    const doc = <QuotationPDFDocument quotation={quotation} firmData={firmData} />;
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();
    
    return { success: true, blob };
  } catch (error) {
    // Error generating PDF
    return { success: false, error };
  }
};

export const downloadQuotationPDF = async (quotation: any) => {
  try {
    const result = await generateQuotationPDF(quotation);
    if (result.success && result.blob) {
      const fileName = `Quotation for ${quotation.client?.name || 'Client'} ${new Date().toISOString().split('T')[0]}.pdf`;
      saveAs(result.blob, fileName);
      return { success: true };
    }
  } catch (error) {
    console.error('Error downloading quotation PDF:', error);
    return { success: false, error };
  }
};

export const shareQuotationDetails = async (quotation: any, shareType: 'direct' | 'custom' = 'custom') => {
  try {
    const result = await generateQuotationPDF(quotation);
    if (!result.success || !result.blob) {
      throw new Error('PDF generation failed');
    }

    const fileName = `Quotation for ${quotation.client?.name || 'Client'} ${new Date().toISOString().split('T')[0]}.pdf`;
    const file = new File([result.blob], fileName, { type: 'application/pdf' });
    
    if (shareType === 'direct' && quotation.client?.phone) {
      // Import WhatsApp share utility
      const { shareToClientWhatsApp } = await import('@/lib/whatsapp-share-utils');
      
      return await shareToClientWhatsApp({
        clientName: quotation.client.name,
        clientPhone: quotation.client.phone,
        eventType: quotation.event_type,
        documentType: 'quotation',
        file: file,
        firmId: quotation.firm_id
      });
    } else {
      // Custom share - use existing share functionality  
      const shareText = `QUOTATION DETAILS: ${quotation.title}

Client: ${quotation.client?.name || 'N/A'}
Event Type: ${quotation.event_type}
Event Date: ${new Date(quotation.event_date).toLocaleDateString()}
${quotation.venue ? `Venue: ${quotation.venue}\n` : ''}Amount: ₹${(quotation.amount || 0).toLocaleString()}
${quotation.discount_amount ? `Discount: ₹${quotation.discount_amount.toLocaleString()}\n` : ''}Valid Until: ${quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString() : 'Contact us'}

---
Professional Photography & Videography Services

Quotation PDF is attached for your reference.`;

      const { shareTextWithFile } = await import('@/lib/share-utils');
      return await shareTextWithFile(
        shareText,
        `Quotation: ${quotation.title}`,
        file
      );
    }
  } catch (error) {
    // Error in shareQuotationDetails
    return { success: false, error };
  }
};

