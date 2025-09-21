import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { Payment, Event } from '@/types/studio';
import { formatDate } from '@/lib/date-utils';
import { SharedPDFHeader, SharedPDFFooter, StatusBadge, sharedStyles } from '../pdf/SharedPDFLayout';
import { supabase } from '@/integrations/supabase/client';
import { calculateTotalPaid, calculateTotalClosed, calculateEventBalance, getPaymentStatus } from '@/lib/payment-calculator';

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
  paymentDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  paymentDetailsLeft: {
    flex: 1,
    marginRight: 12,
  },
  paymentDetailsRight: {
    flex: 1,
    marginLeft: 12,
  },
  qrText: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 3,
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
  payment: Payment & { event?: Event; invoice_id?: string | null };
  firmData?: any;
}

// Helper function to determine payment status using the standardized payment calculator
const getEventPaymentStatus = (payment: Payment & { event?: Event }): 'Paid' | 'Pending' | 'Partial' | 'Overdue' => {
  if (!payment.event) {
    return 'Paid'; // If no event, treat as standalone payment
  }

  // Use standardized payment calculator functions
  const paymentStatus = getPaymentStatus(payment.event);
  
  // Convert to PDF status format
  switch (paymentStatus) {
    case 'paid':
      return 'Paid';
    case 'partial':
      return 'Partial';
    case 'unpaid':
      // Check if payment date is overdue
      const eventDate = new Date(payment.event.event_date);
      const today = new Date();
      
      if (eventDate < today) {
        return 'Overdue';
      } else {
        return 'Pending';
      }
    default:
      return 'Pending';
  }
};

const PaymentInvoicePDFDocument: React.FC<PaymentInvoicePDFProps> = ({ payment, firmData }) => {
  const paymentStatus = getEventPaymentStatus(payment);
  const totalAmount = payment.amount;
  const isFullyPaid = paymentStatus === 'Paid';
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <SharedPDFHeader firmData={firmData} />

        <View>
          <Text style={styles.documentId}>Invoice ID: {payment.event?.id || payment.id || 'INV-PREVIEW'}</Text>
          <Text style={styles.title}>PAYMENT INVOICE</Text>
        </View>

        {/* Payment Details - Three Column Layout */}
        <View style={styles.detailsContainer}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Invoice Information</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Invoice Date:</Text>
              <Text style={styles.detailValue}>{formatDate(new Date(payment.payment_date))}</Text>
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

          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Financial Information</Text>
            {payment.event && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Event Amount:</Text>
                  <Text style={styles.detailValue}>₹{payment.event.total_amount?.toLocaleString() || 0}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Paid:</Text>
                  <Text style={styles.detailValue}>₹{calculateTotalPaid(payment.event).toLocaleString()}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Closed:</Text>
                  <Text style={styles.detailValue}>₹{calculateTotalClosed(payment.event).toLocaleString()}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Balance Due:</Text>
                  <Text style={styles.detailValue}>₹{calculateEventBalance(payment.event).toLocaleString()}</Text>
                </View>
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
            <View style={styles.paymentDetailsRow}>
              <View style={styles.paymentDetailsLeft}>
                <Text style={styles.sectionTitle}>Payment Information</Text>
                <Text style={styles.qrText}>UPI ID: {firmData?.upi_id || 'bhaveshphotographer@okicici'}</Text>
                <Text style={styles.qrText}>Account Name: {firmData?.bank_account_name || 'BHAVESH SUTARIYA'}</Text>
              </View>
              <View style={styles.paymentDetailsRight}>
                <Text style={styles.sectionTitle}>Bank Details</Text>
                {firmData?.bank_name && firmData.bank_name.trim() && (
                  <Text style={styles.qrText}>Bank: {firmData.bank_name}</Text>
                )}
                {firmData?.bank_account_number && firmData.bank_account_number.trim() && (
                  <Text style={styles.qrText}>Account: {firmData.bank_account_number}</Text>
                )}
                {firmData?.bank_ifsc_code && firmData.bank_ifsc_code.trim() && (
                  <Text style={styles.qrText}>IFSC: {firmData.bank_ifsc_code}</Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Notes Section */}
        {payment.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <Text style={styles.notesText}>{payment.notes}</Text>
          </View>
        )}


        {/* Footer */}
        <SharedPDFFooter firmData={firmData} />
      </Page>
    </Document>
  );
};

export const generatePaymentInvoicePDF = async (payment: Payment & { event?: Event; invoice_id?: string | null }, firmData?: any, downloadOnly = true) => {
  try {
    const doc = <PaymentInvoicePDFDocument payment={payment} firmData={firmData} />;
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();
    
    if (downloadOnly) {
      const clientName = payment.event?.client?.name || 'Client';
      const fileName = `Invoice for ${clientName} ${new Date().toISOString().split('T')[0]}.pdf`;
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
