import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { shareTextWithFile } from '@/lib/share-utils';
import { SharedPDFHeader, SharedPDFFooter, sharedStyles } from '../pdf/SharedPDFLayout';
import { formatDate } from '@/lib/date-utils';

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
    padding: 8,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
}

const QuotationPDFDocument: React.FC<QuotationPDFProps> = ({ quotation }) => {
  const details = quotation.quotation_details 
    ? (typeof quotation.quotation_details === 'string' 
        ? JSON.parse(quotation.quotation_details) 
        : quotation.quotation_details)
    : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <SharedPDFHeader />

        <View>
          <Text style={styles.documentId}>Quote ID: QUO-{quotation.id?.slice(-8).toUpperCase() || 'XXXXX'}</Text>
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
              <Text style={styles.detailValue}>{formatDate(new Date(quotation.event_date))}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Venue:</Text>
              <Text style={styles.detailValue}>{quotation.venue || 'To be determined'}</Text>
            </View>
          </View>
        </View>

        {/* Service Breakdown Table - FIRST PAGE */}
        {details?.days && details.days.length > 0 && (
          <View style={styles.table}>
            <Text style={styles.tableTitle}>SERVICE BREAKDOWN</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellHeader, { flex: 2 }]}>Service</Text>
              <Text style={[styles.tableCellHeader, { flex: 1 }]}>Count</Text>
              <Text style={[styles.tableCellHeader, { flex: 2.5 }]}>Description</Text>
            </View>
            {details.days.map((day: any, dayIndex: number) => (
              <View key={dayIndex}>
                <View style={styles.dayHeaderRow}>
                  <Text style={[styles.tableCellBold, { flex: 2 }]}>{day.name}</Text>
                  <Text style={[styles.tableCellLeft, { flex: 1 }]}></Text>
                  <Text style={[styles.tableCellLeft, { flex: 2.5 }]}></Text>
                </View>
                {day.photographers > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCellLeft, { flex: 2 }]}>  • Photographers</Text>
                    <Text style={[styles.tableCellCenter, { flex: 1 }]}>{day.photographers}</Text>
                    <Text style={[styles.tableCellLeft, { flex: 2.5 }]}>Professional Photography Coverage</Text>
                  </View>
                )}
                {day.cinematographers > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCellLeft, { flex: 2 }]}>  • Cinematography</Text>
                    <Text style={[styles.tableCellCenter, { flex: 1 }]}>{day.cinematographers}</Text>
                    <Text style={[styles.tableCellLeft, { flex: 2.5 }]}>Professional Cinematography Coverage</Text>
                  </View>
                )}
                {day.drone > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCellLeft, { flex: 2 }]}>  • Drone Coverage</Text>
                    <Text style={[styles.tableCellCenter, { flex: 1 }]}>{day.drone}</Text>
                    <Text style={[styles.tableCellLeft, { flex: 2.5 }]}>Aerial Photography & Videography</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Add-ons Table - FIRST PAGE */}
        {details?.addOns && details.addOns.length > 0 && (
          <View style={styles.table}>
            <Text style={styles.tableTitle}>ADDITIONAL SERVICES</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellHeader, { flex: 2 }]}>Service</Text>
              <Text style={[styles.tableCellHeader, { flex: 1 }]}>Count</Text>
              <Text style={[styles.tableCellHeader, { flex: 2.5 }]}>Description</Text>
            </View>
            {details.addOns.map((addOn: any, index: number) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCellLeft, { flex: 2 }]}>{addOn.name}</Text>
                <Text style={[styles.tableCellCenter, { flex: 1 }]}>{addOn.quantity || 1}{addOn.unit ? ` ${addOn.unit}` : ''}</Text>
                <Text style={[styles.tableCellLeft, { flex: 2.5 }]}>
                  {addOn.description || 'Premium add-on service'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Page>

      {/* SECOND PAGE - NO HEADER */}
      <Page size="A4" style={styles.secondPage}>
        {/* Post-production Services - SECOND PAGE */}
        {details?.postProductionItems && details.postProductionItems.length > 0 && (
          <View style={styles.table}>
            <Text style={styles.tableTitle}>POST-PRODUCTION SERVICES INCLUDED</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellHeader, { flex: 3 }]}>Service Details</Text>
              <Text style={[styles.tableCellHeader, { flex: 1 }]}>Status</Text>
            </View>
            {details.postProductionItems.map((item: string, index: number) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCellLeft, { flex: 3 }]}>✓ {item.replace(/1/g, '1').replace(/₹/g, 'Rs.')}</Text>
                <Text style={[styles.tableCellCenter, { flex: 1 }]}>Included</Text>
              </View>
            ))}
          </View>
        )}

        {/* Available Add-ons - Table Format */}
        <View style={styles.table}>
          <Text style={styles.tableTitle}>AVAILABLE ADD-ONS</Text>
          
          {/* Table rows with 3 columns */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableCellLeft, { flex: 1 }]}>• 1 Day Drone Coverage</Text>
            <Text style={[styles.tableCellLeft, { flex: 1 }]}>• Live HD Setup</Text>
            <Text style={[styles.tableCellLeft, { flex: 1 }]}>• Side 10x20 LED Wall</Text>
          </View>
          <View style={styles.tableRowAlt}>
            <Text style={[styles.tableCellLeft, { flex: 1 }]}>• 2 Days Pre Wedding</Text>
            <Text style={[styles.tableCellLeft, { flex: 1 }]}>• Background LED</Text>
            <Text style={[styles.tableCellLeft, { flex: 1 }]}>• Album Page LED Wall</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCellLeft, { flex: 1 }]}>• 1 Day Pre Wedding</Text>
            <Text style={[styles.tableCellLeft, { flex: 1 }]}>• 1 Day Pre Photoshot</Text>
            <Text style={[styles.tableCellLeft, { flex: 1 }]}>• Full Length Film 3/4 Hour</Text>
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
        {/* Header */}
        <SharedPDFHeader />

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
        <SharedPDFFooter />
      </Page>
    </Document>
  );
};

export const generateQuotationPDF = async (quotation: any) => {
  try {
    const doc = <QuotationPDFDocument quotation={quotation} />;
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();
    return { success: true, blob };
  } catch (error) {
    console.error('Error generating PDF:', error);
    return { success: false, error };
  }
};

export const shareQuotationDetails = async (quotation: any) => {
  try {
    // Generate the PDF first
    const pdf = await generateQuotationPDF(quotation);
    if (!pdf.success) {
      throw new Error('Failed to generate PDF');
    }

    // Create file name and File object
    const fileName = `Quotation-${quotation.title.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    const file = new File([pdf.blob], fileName, { type: 'application/pdf' });
    
    // Create share text
    const originalAmount = quotation.amount;
    const finalAmount = quotation.discount_type && quotation.discount_value ? originalAmount - quotation.discount_amount : originalAmount;
    const shareText = `📸 QUOTATION: ${quotation.title}

👤 Client: ${quotation.client?.name}
🎭 Event Type: ${quotation.event_type}
📅 Event Date: ${formatDate(new Date(quotation.event_date))}
${quotation.venue ? `📍 Venue: ${quotation.venue}\n` : ''}${quotation.discount_type && quotation.discount_value ? `💰 Original Amount: Rs.${originalAmount.toLocaleString()}\n🎯 Final Amount: Rs.${finalAmount.toLocaleString()} (${quotation.discount_type === 'percentage' ? `${quotation.discount_value}%` : `Rs.${quotation.discount_value.toLocaleString()}`} discount)` : `💰 Amount: Rs.${finalAmount.toLocaleString()}`}
${quotation.valid_until ? `⏰ Valid Until: ${formatDate(new Date(quotation.valid_until))}\n` : ''}
${quotation.description ? `\n📝 Description:\n${quotation.description}` : ''}

---
PRIT PHOTO
Professional Photography & Videography Services
Contact: +91 72850 72603

💡 PDF quotation is attached/downloaded for your reference.`;

    // Use the shared utility to handle sharing
    return await shareTextWithFile(
      shareText,
      `Quotation: ${quotation.title}`,
      file
    );
  } catch (error) {
    console.error('Error in shareQuotationDetails:', error);
    return { success: false, error };
  }
};

export const downloadQuotationPDF = async (quotation: any) => {
  try {
    const pdf = await generateQuotationPDF(quotation);
    if (!pdf.success) {
      throw new Error('Failed to generate PDF');
    }

    const fileName = `Quotation-${quotation.title.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    saveAs(pdf.blob, fileName);
    return { success: true };
  } catch (error) {
    console.error('Error downloading PDF:', error);
    return { success: false, error };
  }
};
