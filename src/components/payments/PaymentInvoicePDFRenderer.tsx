import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import QRCode from 'qrcode';
import { Payment, Event } from '@/types/studio';
import { SharedPDFHeader, SharedPDFFooter, StatusBadge, sharedStyles } from '../pdf/SharedPDFLayout';

const styles = StyleSheet.create({
  ...sharedStyles,
  paymentSection: {
    backgroundColor: '#f8f6f1',
    padding: 12,
    marginVertical: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#c4b28d',
  },
  paymentHeader: {
    textAlign: 'center',
    marginBottom: 8,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 700,
    color: '#c4b28d',
    textAlign: 'center',
    marginBottom: 3,
  },
  paymentStatus: {
    fontSize: 10,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
  },
  qrSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  qrContainer: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  qrCode: {
    width: 80,
    height: 80,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
  },
  qrLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: '#c4b28d',
    marginBottom: 4,
    textAlign: 'center',
  },
  qrDetails: {
    alignItems: 'center',
  },
  qrText: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 2,
    textAlign: 'center',
    lineHeight: 1.3,
  },
  paidSection: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    marginVertical: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#0ea5e9',
    alignItems: 'center',
  },
  paidIcon: {
    fontSize: 24,
    color: '#0ea5e9',
    marginBottom: 8,
  },
  paidTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#0ea5e9',
    marginBottom: 4,
  },
  paidMessage: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 1.4,
  },
  eventSection: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    marginVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  notesSection: {
    marginTop: 10,
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  notesText: {
    fontSize: 9,
    color: '#666666',
    lineHeight: 1.4,
  },
  thankYouMessage: {
    fontSize: 9,
    fontWeight: 600,
    color: '#c4b28d',
    textAlign: 'center',
    marginTop: 8,
    padding: 6,
    backgroundColor: '#f8f6f1',
    borderRadius: 3,
  },
});

interface PaymentInvoicePDFProps {
  payment: Payment & { event?: Event };
  qrCodes?: Array<{ dataUrl: string; amount: number; sequence: number }>;
}

// Helper function to determine payment status based on ALL payments for the event
const getPaymentStatus = (payment: Payment & { event?: Event }): 'Paid' | 'Pending' | 'Partial' | 'Overdue' => {
  if (!payment.event) {
    return 'Paid'; // If no event, treat as standalone payment
  }

  const eventTotalAmount = payment.event.total_amount || 0;
  
  // Calculate total of ALL payments for this event
  const allPayments = payment.event.payments || [];
  const totalPaidAmount = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  
  if (totalPaidAmount >= eventTotalAmount) {
    return 'Paid';
  } else if (totalPaidAmount > 0 && totalPaidAmount < eventTotalAmount) {
    return 'Partial';
  } else {
    // Check if payment date is overdue
    const eventDate = new Date(payment.event.event_date);
    const today = new Date();
    
    if (eventDate < today) {
      return 'Overdue';
    } else {
      return 'Pending';
    }
  }
};

const PaymentInvoicePDFDocument: React.FC<PaymentInvoicePDFProps> = ({ payment, qrCodes = [] }) => {
  const paymentStatus = getPaymentStatus(payment);
  const totalAmount = payment.amount;
  const hasMultiplePayments = qrCodes.length > 1;
  const isFullyPaid = paymentStatus === 'Paid';
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <SharedPDFHeader />

        <View>
          <Text style={styles.documentId}>Invoice ID: INV-{payment.id.slice(-8).toUpperCase()}</Text>
          <Text style={styles.title}>PAYMENT INVOICE</Text>
        </View>

        {/* Payment Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Invoice Information</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Invoice Date:</Text>
              <Text style={styles.detailValue}>{new Date(payment.payment_date).toLocaleDateString()}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Method:</Text>
              <Text style={styles.detailValue}>{payment.payment_method}</Text>
            </View>
            {payment.reference_number && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Reference #:</Text>
                <Text style={styles.detailValue}>{payment.reference_number}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <View>
                <StatusBadge status={paymentStatus} />
              </View>
            </View>
            {payment.event && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Event Amount:</Text>
                  <Text style={styles.detailValue}>₹{payment.event.total_amount?.toLocaleString() || 0}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Paid:</Text>
                  <Text style={styles.detailValue}>₹{(payment.event.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Balance Due:</Text>
                  <Text style={styles.detailValue}>₹{Math.max(0, (payment.event.total_amount || 0) - (payment.event.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0)).toLocaleString()}</Text>
                </View>
              </>
            )}
          </View>
          
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone:</Text>
              <Text style={styles.detailValue}>+91 72850 72603</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email:</Text>
              <Text style={styles.detailValue}>pritphoto1985@gmail.com</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>UPI ID:</Text>
              <Text style={styles.detailValue}>bhaveshphotographer@okicici</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Business:</Text>
              <Text style={styles.detailValue}>BHAVESH SUTARIYA</Text>
            </View>
          </View>
        </View>

        {/* Event Details */}
        {payment.event && (
          <View style={styles.eventSection}>
            <Text style={styles.sectionTitle}>Event Information</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Event Name:</Text>
              <Text style={styles.detailValue}>{payment.event.title}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Event Date:</Text>
              <Text style={styles.detailValue}>{new Date(payment.event.event_date).toLocaleDateString()}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Event Type:</Text>
              <Text style={styles.detailValue}>{payment.event.event_type}</Text>
            </View>
            {payment.event.venue && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Venue:</Text>
                <Text style={styles.detailValue}>{payment.event.venue}</Text>
              </View>
            )}
          </View>
        )}

        {/* Payment Amount Section */}
        <View style={styles.paymentSection}>
          <View style={styles.paymentHeader}>
            <Text style={styles.paymentAmount}>
              Total Payment Amount: ₹{totalAmount.toLocaleString()}
            </Text>
            <Text style={styles.paymentStatus}>
              Payment received via {payment.payment_method}
            </Text>
            {hasMultiplePayments && (
              <Text style={[styles.paymentStatus, { color: '#c4b28d', fontWeight: 600 }]}>
                Split into {qrCodes.length} payments (Indian transaction limit: ₹1,00,000)
              </Text>
            )}
          </View>
          
          {/* Payment Status Section */}
          {isFullyPaid ? (
            <View style={styles.paidSection}>
              <Text style={styles.paidIcon}>✅</Text>
              <Text style={styles.paidTitle}>Payment Completed</Text>
              <Text style={styles.paidMessage}>
                Thank you! This invoice has been fully paid. Your payment has been received and processed successfully.
                {'\n\n'}We appreciate your business and look forward to serving you again.
              </Text>
            </View>
          ) : (
            <>
              {/* QR Codes in Same Row */}
              <View style={styles.qrSection}>
                {qrCodes.map((qrCode, index) => (
                  <View key={index} style={styles.qrContainer}>
                    <Text style={styles.qrLabel}>
                      {hasMultiplePayments ? `${qrCode.sequence}/${qrCodes.length}` : 'Scan to Pay'}
                    </Text>
                    <Image style={styles.qrCode} src={qrCode.dataUrl} />
                  </View>
                ))}
              </View>
              
              {/* Single Payment Details Section */}
              <View style={styles.qrDetails}>
                <Text style={styles.qrText}>UPI ID: bhaveshphotographer@okicici</Text>
                <Text style={styles.qrText}>Account Name: BHAVESH SUTARIYA</Text>
                
                {/* Amount breakdown for multiple payments */}
                {hasMultiplePayments ? (
                  <View style={{ marginTop: 6 }}>
                    {qrCodes.map((qrCode, index) => (
                      <Text key={index} style={[styles.qrText, { fontWeight: 700, color: '#c4b28d' }]}>
                        {qrCode.sequence}/{qrCodes.length}: ₹{qrCode.amount.toLocaleString()}
                      </Text>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.qrText, { fontWeight: 700, color: '#c4b28d', marginTop: 4 }]}>
                    Amount: ₹{totalAmount.toLocaleString()}
                  </Text>
                )}
              </View>
            </>
          )}
        </View>

        {/* Notes Section */}
        {payment.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <Text style={styles.notesText}>{payment.notes}</Text>
          </View>
        )}

        {/* Thank You Message */}
        <Text style={[styles.thankYouMessage, { color: '#c4b28d' }]}>
          THANK YOU FOR CHOOSING PRIT PHOTO STUDIO! WE APPRECIATE YOUR TRUST.
        </Text>

      </Page>
    </Document>
  );
};

export const generatePaymentInvoicePDF = async (payment: Payment & { event?: Event }, downloadOnly = true) => {
  try {
    // Split amount if greater than 1,00,000
    const MAX_AMOUNT = 100000; // 1 lakh
    const paymentAmount = payment.amount;
    const splitPayments: Array<{ amount: number; sequence: number }> = [];
    
    if (paymentAmount > MAX_AMOUNT) {
      let remainingAmount = paymentAmount;
      let sequence = 1;
      
      while (remainingAmount > 0) {
        const currentAmount = Math.min(remainingAmount, MAX_AMOUNT);
        splitPayments.push({ amount: currentAmount, sequence });
        remainingAmount -= currentAmount;
        sequence++;
      }
    } else {
      splitPayments.push({ amount: paymentAmount, sequence: 1 });
    }

    // Generate QR codes for each split payment
    const qrCodeDataUrls: Array<{ dataUrl: string; amount: number; sequence: number }> = [];
    
    for (const splitPayment of splitPayments) {
      try {
        const upiId = "bhaveshphotographer@okicici";
        const companyName = "BHAVESH SUTARIYA";
        const transactionNote = splitPayments.length > 1 
          ? `Payment ${splitPayment.sequence}/${splitPayments.length} for ${payment.event?.title || 'Service'}`
          : `Payment for ${payment.event?.title || 'Service'}`;
        
        const upiData = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(companyName)}&am=${splitPayment.amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
        
        const qrCodeDataUrl = await QRCode.toDataURL(upiData, {
          width: 250,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        });
        
        qrCodeDataUrls.push({
          dataUrl: qrCodeDataUrl,
          amount: splitPayment.amount,
          sequence: splitPayment.sequence
        });
      } catch (qrError) {
        console.error('Error generating QR code for split payment:', qrError);
      }
    }

    const doc = <PaymentInvoicePDFDocument payment={payment} qrCodes={qrCodeDataUrls} />;
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();
    
    if (downloadOnly) {
      const fileName = `Payment-Invoice-${payment.id.slice(-8)}-${new Date().toISOString().split('T')[0]}.pdf`;
      saveAs(blob, fileName);
      return { success: true };
    } else {
      return { success: true, blob };
    }
  } catch (error) {
    console.error('Error generating payment invoice PDF:', error);
    return { success: false, error };
  }
};
