/**
 * Other Entity Handlers
 * Handles syncing expenses, staff, freelancers, and accounting entries to Google Sheets
 */

import { updateOrAppendToSheet, ensureSheetExists, deleteFromSheet, getSheetValues } from '../../_shared/google-sheets-helpers.ts';
import { SHEET_HEADERS } from '../../shared/sheet-headers.ts';

export async function syncExpenseToSheet(
  supabase: any, 
  accessToken: string, 
  spreadsheetId: string, 
  expenseId: string,
  operation: 'create' | 'update' | 'delete' = 'update'
) {
  await ensureSheetExists(accessToken, spreadsheetId, 'Expenses', SHEET_HEADERS.EXPENSES);

  if (operation === 'delete') {
    await deleteFromSheet(accessToken, spreadsheetId, 'Expenses', expenseId, 0);
    return { id: expenseId, description: 'Deleted Expense' };
  }

  const { data: expense, error } = await supabase
    .from('expenses')
    .select(`
      *,
      event:events(title)
    `)
    .eq('id', expenseId)
    .single();

  if (error || !expense) {
    throw new Error(`Expense not found: ${error?.message}`);
  }

  // Extract person name from salary expense description
  let vendor = 'N/A';
  if (expense.category === 'Salary' && expense.description) {
    const matches = expense.description.match(/(?:Staff|Freelancer) payment to (.+)/i);
    if (matches && matches[1]) {
      vendor = matches[1].trim();
    }
  }

  const expenseData = [
    expense.id,                                        // Expense ID
    expense.expense_date,                              // Date
    expense.category,                                  // Category
    vendor,                                            // Vendor
    expense.description,                               // Description
    expense.amount,                                    // Amount
    expense.payment_method || 'Cash',                  // Payment Method
    expense.event?.title || '',                        // Event
    expense.receipt_url ? 'Yes' : 'No',               // Receipt
    expense.notes || ''                                // Remarks
  ];

  await updateOrAppendToSheet(accessToken, spreadsheetId, 'Expenses', expenseData, 0);
  return expense;
}

export async function syncStaffToSheet(
  supabase: any, 
  accessToken: string, 
  spreadsheetId: string, 
  staffId: string,
  operation: 'create' | 'update' | 'delete' = 'update'
) {
  await ensureSheetExists(accessToken, spreadsheetId, 'Staff', SHEET_HEADERS.STAFF);

  if (operation === 'delete') {
    await deleteFromSheet(accessToken, spreadsheetId, 'Staff', staffId, 0);
    return { id: staffId, full_name: 'Deleted Staff' };
  }

  const { data: staff, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', staffId)
    .single();

  if (error || !staff) {
    throw new Error(`Staff not found: ${error?.message}`);
  }

  // Check if staff already exists in sheet to prevent duplicates
  const existingData = await getSheetValues(accessToken, spreadsheetId, 'Staff');
  const staffExists = existingData.some((row: any[], index: number) => {
    return index > 0 && row.length > 0 && row[0] === staff.id;
  });

  if (staffExists && operation === 'create') {
    return staff;
  }

  const staffData = [
    staff.id,                                              // Staff ID
    staff.full_name,                                       // Full Name
    staff.role,                                            // Role
    staff.mobile_number,                                   // Mobile Number
    staff.created_at.split('T')[0],                        // Join Date
    ''                                                     // Remarks
  ];

  await updateOrAppendToSheet(accessToken, spreadsheetId, 'Staff', staffData, 0);
  return staff;
}

export async function syncFreelancerToSheet(
  supabase: any, 
  accessToken: string, 
  spreadsheetId: string, 
  freelancerId: string,
  operation: 'create' | 'update' | 'delete' = 'update'
) {
  await ensureSheetExists(accessToken, spreadsheetId, 'Freelancers', SHEET_HEADERS.FREELANCERS);

  if (operation === 'delete') {
    await deleteFromSheet(accessToken, spreadsheetId, 'Freelancers', freelancerId, 0);
    return { id: freelancerId, full_name: 'Deleted Freelancer' };
  }

  const { data: freelancer, error } = await supabase
    .from('freelancers')
    .select('*')
    .eq('id', freelancerId)
    .single();

  if (error || !freelancer) {
    throw new Error(`Freelancer not found: ${error?.message}`);
  }

  const freelancerData = [
    freelancer.id,                                         // Freelancer ID
    freelancer.full_name,                                  // Name
    freelancer.role,                                       // Role
    freelancer.phone || '',                                // Phone
    freelancer.email || '',                                // Email
    freelancer.rate || 0,                                  // Rate
    ''                                                     // Remarks
  ];

  await updateOrAppendToSheet(accessToken, spreadsheetId, 'Freelancers', freelancerData, 0);
  return freelancer;
}

export async function syncAccountingToSheet(
  supabase: any, 
  accessToken: string, 
  spreadsheetId: string, 
  entryId: string,
  operation: 'create' | 'update' | 'delete' = 'update'
) {
  await ensureSheetExists(accessToken, spreadsheetId, 'Accounting', SHEET_HEADERS.ACCOUNTING);

  if (operation === 'delete') {
    await deleteFromSheet(accessToken, spreadsheetId, 'Accounting', entryId, 0);
    return { id: entryId, title: 'Deleted Entry' };
  }

  const { data: entry, error } = await supabase
    .from('accounting_entries')
    .select('*')
    .eq('id', entryId)
    .single();

  if (error || !entry) {
    throw new Error(`Accounting entry not found: ${error?.message}`);
  }

  const accountingData = [
    entry.id,                                              // Entry ID
    entry.entry_type,                                      // Entry Type (Credit/Debit)
    entry.category,                                        // Category
    entry.subcategory || '',                               // Subcategory
    entry.title,                                           // Title
    entry.description || '',                               // Description
    entry.amount,                                          // Amount
    entry.entry_date,                                      // Entry Date
    entry.payment_method || 'Cash',                        // Payment Method
    entry.document_url || '',                              // Document URL
    entry.reflect_to_company ? 'Yes' : 'No',              // Reflect to Company
    entry.created_at.split('T')[0]                         // Created Date
  ];

  await updateOrAppendToSheet(accessToken, spreadsheetId, 'Accounting', accountingData, 0);
  return entry;
}