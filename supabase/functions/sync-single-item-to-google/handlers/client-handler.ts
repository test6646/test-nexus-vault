/**
 * Client Sync Handler
 * Handles syncing client data to Google Sheets
 */

import { updateOrAppendToSheet, ensureSheetExists } from '../../_shared/google-sheets-helpers.ts';
import { SHEET_HEADERS } from '../../shared/sheet-headers.ts';

export async function syncClientToSheet(
  supabase: any, 
  accessToken: string, 
  spreadsheetId: string, 
  clientId: string,
  operation: 'create' | 'update' | 'delete' = 'update'
) {
  // Ensure Clients sheet exists with proper headers
  await ensureSheetExists(accessToken, spreadsheetId, 'Clients', SHEET_HEADERS.CLIENTS);

  if (operation === 'delete') {
    // Handle delete operation - import deleteFromSheet when needed
    const { deleteFromSheet } = await import('../../_shared/google-sheets-helpers.ts');
    await deleteFromSheet(accessToken, spreadsheetId, 'Clients', clientId, 0);
    return { id: clientId, name: 'Deleted Client' };
  }

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  if (error || !client) {
    throw new Error(`Client not found: ${error?.message}`);
  }

  // Client data to match EXACT CENTRALIZED headers
  const clientData = [
    client.id,                   // Client ID - FOR MATCHING/COMPARING
    client.name,                 // Client Name
    client.phone,                // Phone Number  
    client.email || '',          // Email
    client.address || '',        // Address / City
    client.notes || ''           // Remarks / Notes
  ];

  await updateOrAppendToSheet(accessToken, spreadsheetId, 'Clients', clientData, 0);
  return client;
}