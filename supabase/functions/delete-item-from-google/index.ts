import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

console.log('🗑️ Delete Item from Google Sheets function loaded');

// Google Auth helper function
async function getGoogleAuth() {
  const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
  if (!serviceAccountJson) {
    throw new Error('Google service account JSON not configured');
  }
  
  const serviceAccount = JSON.parse(serviceAccountJson);
  
  // Create JWT for Google API authentication
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };
  
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  
  const signatureInput = `${headerB64}.${payloadB64}`;
  
  // Import private key
  const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
  
  // Convert PEM to DER format
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = privateKey.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const keyData = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    keyData,
    encoder.encode(signatureInput)
  );
  
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  
  const jwt = `${headerB64}.${payloadB64}.${signatureB64}`;
  
  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  
  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error('Failed to get Google access token');
  }
  
  return tokenData.access_token;
}

// Helper to get sheet ID by name
async function getSheetId(accessToken: string, spreadsheetId: string, sheetName: string): Promise<number> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to get spreadsheet metadata');
  }
  
  const spreadsheet = await response.json();
  const sheet = spreadsheet.sheets.find((s: any) => s.properties.title === sheetName);
  
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }
  
  return sheet.properties.sheetId;
}

// Helper function to get all values from a sheet
async function getSheetValues(accessToken: string, spreadsheetId: string, sheetName: string) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get sheet values ${sheetName}: ${error}`);
  }
  
  const result = await response.json();
  return result.values || [];
}

// Delete row from Google Sheet
async function deleteRowFromSheet(accessToken: string, spreadsheetId: string, sheetName: string, itemId: string, matchColumnIndex: number = 0) {
  // Get existing data
  const existingData = await getSheetValues(accessToken, spreadsheetId, sheetName);
  
  // Find the row to delete (skip header row)
  let rowIndex = -1;
  
  for (let i = 1; i < existingData.length; i++) {
    if (existingData[i] && existingData[i][matchColumnIndex] === itemId) {
      rowIndex = i; // Keep 0-indexed for deletion
      break;
    }
  }
  
  if (rowIndex === -1) {
    console.log(`⚠️ Item ${itemId} not found in ${sheetName} sheet`);
    return { deleted: false, message: `Item not found in ${sheetName}` };
  }
  
  // Get sheet ID for batch update
  const sheetId = await getSheetId(accessToken, spreadsheetId, sheetName);
  
  // Delete the row
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1
            }
          }
        }]
      })
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete row from sheet ${sheetName}: ${error}`);
  }
  
  console.log(`✅ Deleted row ${rowIndex + 1} from ${sheetName} sheet`);
  return { deleted: true, message: `Successfully deleted from ${sheetName}` };
}

// Delete client from Google Sheets
async function deleteClientFromSheet(accessToken: string, spreadsheetId: string, clientId: string) {
  return await deleteRowFromSheet(accessToken, spreadsheetId, 'Clients', clientId, 0);
}

// Delete expense from Google Sheets
async function deleteExpenseFromSheet(accessToken: string, spreadsheetId: string, expenseId: string) {
  return await deleteRowFromSheet(accessToken, spreadsheetId, 'Expenses', expenseId, 0);
}

// Delete event from Google Sheets (from both Master Events and specific event type sheet)
async function deleteEventFromSheet(supabase: any, accessToken: string, spreadsheetId: string, eventId: string) {
  // First get the event to know its type
  const { data: event } = await supabase
    .from('events')
    .select('event_type')
    .eq('id', eventId)
    .single();

  const results = [];
  
  // Delete from Master Events sheet
  const masterResult = await deleteRowFromSheet(accessToken, spreadsheetId, 'Master Events', eventId, 0);
  results.push(masterResult);
  
  // Delete from specific event type sheet if event type is known
  if (event?.event_type) {
    const eventTypeSheet = event.event_type === 'Others' ? 'Others' : event.event_type;
    const typeResult = await deleteRowFromSheet(accessToken, spreadsheetId, eventTypeSheet, eventId, 0);
    results.push(typeResult);
  }
  
  return results;
}

// Delete task from Google Sheets
async function deleteTaskFromSheet(accessToken: string, spreadsheetId: string, taskId: string) {
  return await deleteRowFromSheet(accessToken, spreadsheetId, 'Tasks', taskId, 0);
}

// Delete staff from Google Sheets
async function deleteStaffFromSheet(accessToken: string, spreadsheetId: string, staffId: string) {
  return await deleteRowFromSheet(accessToken, spreadsheetId, 'Staff', staffId, 0);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    console.log('🗑️ Starting deletion from Google Sheets...');
    const { itemType, itemId, firmId } = await req.json();
    
    if (!itemType || !itemId || !firmId) {
      console.error('❌ Missing required parameters');
      return new Response(JSON.stringify({
        success: false,
        error: 'itemType, itemId, and firmId are required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      return new Response(JSON.stringify({
        success: false,
        error: 'Server configuration error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get firm details
    const { data: firm, error: firmError } = await supabase
      .from('firms')
      .select('*')
      .eq('id', firmId)
      .single();

    if (firmError || !firm || !firm.spreadsheet_id) {
      console.error('❌ Firm not found or no spreadsheet configured');
      return new Response(JSON.stringify({
        success: false,
        error: 'Firm not found or no Google Spreadsheet configured'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get Google authentication
    let accessToken: string;
    try {
      accessToken = await getGoogleAuth();
      console.log('✅ Google authentication successful');
    } catch (error) {
      console.error('❌ Google authentication failed:', error.message);
      return new Response(JSON.stringify({
        success: false,
        error: `Google authentication failed: ${error.message}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let deletionResult;
    let message = '';

    // Delete based on item type
    switch (itemType) {
      case 'client':
        deletionResult = await deleteClientFromSheet(accessToken, firm.spreadsheet_id, itemId);
        message = `Client deleted from Google Sheets`;
        break;
      
      case 'event':
        deletionResult = await deleteEventFromSheet(supabase, accessToken, firm.spreadsheet_id, itemId);
        message = `Event deleted from Google Sheets`;
        break;
      
      case 'task':
        deletionResult = await deleteTaskFromSheet(accessToken, firm.spreadsheet_id, itemId);
        message = `Task deleted from Google Sheets`;
        break;
      
      case 'expense':
        deletionResult = await deleteExpenseFromSheet(accessToken, firm.spreadsheet_id, itemId);
        message = `Expense deleted from Google Sheets`;
        break;
      
      case 'staff':
        deletionResult = await deleteStaffFromSheet(accessToken, firm.spreadsheet_id, itemId);
        message = `Staff deleted from Google Sheets`;
        break;
      
      default:
        throw new Error(`Unsupported item type: ${itemType}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message,
      deletionResult,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${firm.spreadsheet_id}/edit`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});