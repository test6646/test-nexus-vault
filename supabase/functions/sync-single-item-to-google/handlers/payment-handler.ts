/**
 * Payment Handlers
 * Handles syncing payment, staff payment, and freelancer payment data to Google Sheets
 */

import { updateOrAppendToSheet, ensureSheetExists, deleteFromSheet } from '../../_shared/google-sheets-helpers.ts';
import { SHEET_HEADERS } from '../../shared/sheet-headers.ts';

export async function syncPaymentToSheet(
  supabase: any, 
  accessToken: string, 
  spreadsheetId: string, 
  paymentId: string,
  operation: 'create' | 'update' | 'delete' = 'update'
) {
  // Ensure Payments sheet exists with proper headers
  await ensureSheetExists(accessToken, spreadsheetId, 'Payments', SHEET_HEADERS.PAYMENTS);

  if (operation === 'delete') {
    await deleteFromSheet(accessToken, spreadsheetId, 'Payments', paymentId, 0);
    return { id: paymentId, amount: 0 };
  }

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (paymentError || !payment) {
    throw new Error(`Payment not found: ${paymentError?.message}`);
  }

  // Get event details separately to avoid relationship issues
  let eventTitle = 'Unknown Event';
  let clientName = 'Unknown Client';
  
  if (payment.event_id) {
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        title,
        clients(name)
      `)
      .eq('id', payment.event_id)
      .single();
    
    if (event && !eventError) {
      eventTitle = event.title || 'Unknown Event';
      clientName = event.clients?.name || 'Unknown Client';
    }
  }
  
  // Payment data to match headers
  const paymentData = [
    payment.id,                                           // Payment ID
    eventTitle,                                           // Event
    clientName,                                           // Client
    payment.amount || 0,                                  // Amount
    payment.payment_method || 'Cash',                     // Payment Method
    payment.payment_date || new Date().toISOString().split('T')[0], // Payment Date
    payment.reference_number || '',                       // Reference Number
    payment.notes || '',                                  // Notes
    payment.created_at?.split('T')[0] || new Date().toISOString().split('T')[0] // Created Date
  ];

  await updateOrAppendToSheet(accessToken, spreadsheetId, 'Payments', paymentData, 0);
  return payment;
}

export async function syncStaffPaymentToSheet(
  supabase: any, 
  accessToken: string, 
  spreadsheetId: string, 
  paymentId: string,
  operation: 'create' | 'update' | 'delete' = 'update'
) {
  // For staff payments, we'll create an expense entry in the Expenses sheet
  await ensureSheetExists(accessToken, spreadsheetId, 'Expenses', SHEET_HEADERS.EXPENSES);

  if (operation === 'delete') {
    // Try to find and delete the corresponding expense
    await deleteFromSheet(accessToken, spreadsheetId, 'Expenses', `staff-payment-${paymentId}`, 0);
    return { id: paymentId, amount: 0 };
  }

  const { data: staffPayment, error } = await supabase
    .from('staff_payments')
    .select(`
      *,
      staff:profiles!staff_payments_staff_id_fkey(full_name),
      event:events(title)
    `)
    .eq('id', paymentId)
    .single();

  if (error || !staffPayment) {
    throw new Error(`Staff payment not found: ${error?.message}`);
  }

  // Create expense data for staff payment
  const expenseData = [
    `staff-payment-${staffPayment.id}`,                // Expense ID (unique identifier)
    staffPayment.payment_date,                         // Date
    'Salary',                                          // Category
    staffPayment.staff?.full_name || 'Unknown Staff',  // Vendor (staff name)
    `Staff payment to ${staffPayment.staff?.full_name || 'Unknown Staff'}${staffPayment.description ? ` - ${staffPayment.description}` : ''}`, // Description
    staffPayment.amount,                               // Amount
    staffPayment.payment_method || 'Cash',             // Payment Method
    staffPayment.event?.title || '',                   // Event
    '',                                                // Receipt
    `Staff Payment ID: ${staffPayment.id}`             // Remarks
  ];

  await updateOrAppendToSheet(accessToken, spreadsheetId, 'Expenses', expenseData, 0);
  return staffPayment;
}

export async function syncFreelancerPaymentToSheet(
  supabase: any, 
  accessToken: string, 
  spreadsheetId: string, 
  paymentId: string,
  operation: 'create' | 'update' | 'delete' = 'update'
) {
  // For freelancer payments, we'll create an expense entry in the Expenses sheet
  await ensureSheetExists(accessToken, spreadsheetId, 'Expenses', SHEET_HEADERS.EXPENSES);

  if (operation === 'delete') {
    // Try to find and delete the corresponding expense
    await deleteFromSheet(accessToken, spreadsheetId, 'Expenses', `freelancer-payment-${paymentId}`, 0);
    return { id: paymentId, amount: 0 };
  }

  const { data: freelancerPayment, error } = await supabase
    .from('freelancer_payments')
    .select(`
      *,
      freelancer:freelancers!freelancer_payments_freelancer_id_fkey(full_name),
      event:events(title)
    `)
    .eq('id', paymentId)
    .single();

  if (error || !freelancerPayment) {
    throw new Error(`Freelancer payment not found: ${error?.message}`);
  }

  // Create expense data for freelancer payment
  const expenseData = [
    `freelancer-payment-${freelancerPayment.id}`,                    // Expense ID (unique identifier)
    freelancerPayment.payment_date,                                  // Date
    'Salary',                                                        // Category
    freelancerPayment.freelancer?.full_name || 'Unknown Freelancer', // Vendor (freelancer name)
    `Freelancer payment to ${freelancerPayment.freelancer?.full_name || 'Unknown Freelancer'}${freelancerPayment.description ? ` - ${freelancerPayment.description}` : ''}`, // Description
    freelancerPayment.amount,                                        // Amount
    freelancerPayment.payment_method || 'Cash',                      // Payment Method
    freelancerPayment.event?.title || '',                            // Event
    '',                                                              // Receipt
    `Freelancer Payment ID: ${freelancerPayment.id}`                 // Remarks
  ];

  await updateOrAppendToSheet(accessToken, spreadsheetId, 'Expenses', expenseData, 0);
  return freelancerPayment;
}