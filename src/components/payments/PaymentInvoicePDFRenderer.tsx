import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import QRCode from 'qrcode';
import { Payment, Event } from '@/types/studio';
import { formatDate } from '@/lib/date-utils';
import { SharedPDFHeader, SharedPDFFooter, StatusBadge, sharedStyles } from '../pdf/SharedPDFLayout';
import { supabase } from '@/integrations/supabase/client';

const styles = StyleSheet.create({
  ...sharedStyles,
  paymentSection: {
    backgroundColor: '#f8f6f1',
    padding: 16,
    marginVertical: 16,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#c4b28d',
  },
  paymentHeader: {
    textAlign: 'center',
    marginBottom: 12,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: 700,
    color: '#c4b28d',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  paymentStatus: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 12,
  },
  qrSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  qrContainer: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  qrCode: {
    width: 100,
    height: 100,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#c4b28d',
    marginBottom: 10,
  },
  qrLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: '#c4b28d',
    marginBottom: 6,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  qrDetails: {
    alignItems: 'center',
    marginTop: 8,
  },
  qrText: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 3,
    textAlign: 'center',
    lineHeight: 1.4,
  },
  paidSection: {
    backgroundColor: '#f0f9ff',
    padding: 20,
    marginVertical: 16,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#0ea5e9',
    alignItems: 'center',
  },
  paidIcon: {
    fontSize: 28,
    color: '#0ea5e9',
    marginBottom: 10,
  },
  paidTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#0ea5e9',
    marginBottom: 6,
  },
  paidMessage: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 1.5,
  },
  eventSection: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    marginVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  notesSection: {
    marginTop: 12,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  notesText: {
    fontSize: 10,
    color: '#666666',
    lineHeight: 1.5,
  },
  thankYouMessage: {
    fontSize: 11,
    fontWeight: 700,
    color: '#c4b28d',
    textAlign: 'center',
    marginTop: 12,
    padding: 10,
    backgroundColor: '#f8f6f1',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c4b28d',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

interface PaymentInvoicePDFProps {
  payment: Payment & { event?: Event };
  qrCodes?: Array<{ dataUrl: string; amount: number; sequence: number }>;
  firmData?: {
    name: string;
    description?: string;
    logo_url?: string;
    header_left_content?: string;
    footer_content?: string;
    upi_id?: string;
    account_name?: string;
  };
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

const PaymentInvoicePDFDocument: React.FC<PaymentInvoicePDFProps> = ({ payment, qrCodes = [], firmData }) => {
  const paymentStatus = getPaymentStatus(payment);
  const totalAmount = payment.amount;
  const hasMultiplePayments = qrCodes.length > 1;
  const isFullyPaid = paymentStatus === 'Paid';
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <SharedPDFHeader firmData={firmData} />

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
              <Text style={styles.detailValue}>{formatDate(new Date(payment.payment_date))}</Text>
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
            <Text style={styles.sectionTitle}>Event Information</Text>
            {payment.event && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Event Name:</Text>
                  <Text style={styles.detailValue}>{payment.event.title}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Event Date:</Text>
                  <Text style={styles.detailValue}>{formatDate(new Date(payment.event.event_date))}</Text>
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
              </>
            )}
          </View>
        </View>


        {/* Payment Amount Section */}
        <View style={styles.paymentSection}>
          <View style={styles.paymentHeader}>
            <Text style={styles.paymentAmount}>
              Total Payment Amount: ₹{totalAmount.toLocaleString()}
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
                    <Text style={[styles.qrText, { fontWeight: 700, color: '#c4b28d', marginBottom: 4 }]}>
                      QR Amount: ₹{qrCode.amount.toLocaleString()}
                    </Text>
                    <Text style={styles.qrLabel}>
                      {hasMultiplePayments ? `${qrCode.sequence}/${qrCodes.length}` : 'Scan to Pay'}
                    </Text>
                    <Image style={styles.qrCode} src={qrCode.dataUrl} />
                  </View>
                ))}
              </View>
              
              {/* Payment Details Section */}
              <View style={styles.qrDetails}>
                <Text style={styles.qrText}>UPI ID: {firmData?.upi_id || 'bhaveshphotographer@okicici'}</Text>
                <Text style={styles.qrText}>Account Name: {firmData?.account_name || 'BHAVESH SUTARIYA'}</Text>
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
          THANK YOU FOR CHOOSING {firmData?.name?.toUpperCase() || 'PRIT PHOTO'}! WE APPRECIATE YOUR TRUST.
        </Text>

      </Page>
    </Document>
  );
};

export const generatePaymentInvoicePDF = async (payment: Payment & { event?: Event }, firmData?: any, downloadOnly = true) => {
  try {
    // Calculate the actual remaining balance CORRECTLY
    const eventTotalAmount = payment.event?.total_amount || payment.amount;
    
    // Get all payments for this event (including advance payments)
    const allPayments = payment.event?.payments || [];
    const totalAlreadyPaid = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    // Calculate remaining balance after deducting all payments made
    const actualBalanceAmount = Math.max(0, eventTotalAmount - totalAlreadyPaid);
    
    // For QR generation: use balance amount if there's a pending balance, otherwise use the current payment amount
    const qrAmount = actualBalanceAmount > 0 ? actualBalanceAmount : payment.amount;
    
    // Split QR amount if greater than 1,00,000
    const MAX_AMOUNT = 100000; // 1 lakh
    const splitPayments: Array<{ amount: number; sequence: number }> = [];
    
    if (qrAmount > MAX_AMOUNT) {
      let remainingAmount = qrAmount;
      let sequence = 1;
      
      while (remainingAmount > 0) {
        const currentAmount = Math.min(remainingAmount, MAX_AMOUNT);
        splitPayments.push({ amount: currentAmount, sequence });
        remainingAmount -= currentAmount;
        sequence++;
      }
    } else {
      splitPayments.push({ amount: qrAmount, sequence: 1 });
    }

    // Generate QR codes for each split payment
    const qrCodeDataUrls: Array<{ dataUrl: string; amount: number; sequence: number }> = [];
    
    for (const splitPayment of splitPayments) {
      try {
        const upiId = firmData?.upi_id || "bhaveshphotographer@okicici";
        const companyName = firmData?.account_name || "BHAVESH SUTARIYA";
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

    const doc = <PaymentInvoicePDFDocument payment={payment} qrCodes={qrCodeDataUrls} firmData={firmData} />;
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
