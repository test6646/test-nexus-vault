import { shareTextWithFile } from './share-utils';
import { generatePaymentInvoicePDF } from '@/components/payments/PaymentInvoicePDFRenderer';
import { Event } from '@/types/studio';

export const shareEventDetails = async (event: Event) => {
  try {
    // Create a payment object from event data for PDF generation
    const paymentData = {
      id: `event-${event.id}`,
      event_id: event.id,
      amount: event.total_amount || 0,
      payment_method: 'Bank Transfer' as const,
      payment_date: new Date().toISOString(),
      event: event,
      firm_id: event.firm_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Generate the PDF invoice and get the blob for sharing
    const pdfResult = await generatePaymentInvoicePDF(paymentData, false);
    if (!pdfResult.success || !pdfResult.blob) {
      throw new Error('Failed to generate PDF');
    }

    // Create file name and File object from the generated PDF
    const fileName = `Event-Invoice-${event.title.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    const file = new File([pdfResult.blob], fileName, { type: 'application/pdf' });
    
    // Create share text
    const shareText = `🎉 EVENT DETAILS: ${event.title}

👤 Client: ${event.client?.name || 'N/A'}
🎭 Event Type: ${event.event_type}
📅 Event Date: ${new Date(event.event_date).toLocaleDateString()}
${event.venue ? `📍 Venue: ${event.venue}\n` : ''}💰 Total Amount: Rs.${(event.total_amount || 0).toLocaleString()}
💸 Advance Paid: Rs.${(event.advance_amount || 0).toLocaleString()}
💰 Balance Due: Rs.${(event.balance_amount || 0).toLocaleString()}

📊 Event Status:
${event.photo_editing_status ? '✅ Photo Editing Complete' : '⏳ Photo Editing Pending'}
${event.video_editing_status ? '✅ Video Editing Complete' : '⏳ Video Editing Pending'}

---
Prit Photo Studio
Professional Photography & Videography Services
Contact: +91 72850 72603

💡 Event invoice PDF is attached for your reference.`;

    // Use text sharing with the actual PDF file
    return await shareTextWithFile(
      shareText,
      `Event Details: ${event.title}`,
      file
    );
  } catch (error) {
    console.error('Error in shareEventDetails:', error);
    return { success: false, error };
  }
};