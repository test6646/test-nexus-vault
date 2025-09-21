import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Google Auth helper function with timeout
async function getGoogleAuth(timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
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
    
    // Exchange JWT for access token with timeout
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error('Failed to get Google access token');
    }
    
    return tokenData.access_token;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Helper to get sheet ID by name with timeout
async function getSheetId(accessToken: string, spreadsheetId: string, sheetName: string, timeoutMs = 8000): Promise<number> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error('Failed to get spreadsheet metadata');
    }
    
    const spreadsheet = await response.json();
    const sheet = spreadsheet.sheets.find((s: any) => s.properties.title === sheetName);
    
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }
    
    return sheet.properties.sheetId;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Helper function to get all values from a sheet with timeout
async function getSheetValues(accessToken: string, spreadsheetId: string, sheetName: string, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get sheet values ${sheetName}: ${error}`);
    }
    
    const result = await response.json();
    const values = result.values || [];
    return values;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// FIXED: More precise row deletion function that only deletes the exact event
async function deleteRowsFromSheet(
  accessToken: string, 
  spreadsheetId: string, 
  sheetName: string, 
  searchCriteria: { eventId?: string; itemId?: string }, 
  eventData?: any,
  timeoutMs = 10000
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    // Get existing data
    const existingData = await getSheetValues(accessToken, spreadsheetId, sheetName);
    
    if (existingData.length <= 1) {
      return { deleted: false, message: `No data rows found in ${sheetName}` };
    }
    
    // Find rows to delete (skip header row) - MUCH MORE PRECISE MATCHING
    const rowsToDelete = [];
    
    for (let i = 1; i < existingData.length; i++) {
      const row = existingData[i];
      if (row && row.length > 0) {
        let isMatch = false;
        
        // FIXED: More precise event ID matching
        if (searchCriteria.eventId) {
          const cellEventId = row[0]; // Event ID typically in column A
          
          // EXACT match only - no more fuzzy matching that causes issues
          if (cellEventId === searchCriteria.eventId) {
            isMatch = true;
          }
          
          // Check for multi-day event format (e.g., "eventId-day1", "eventId-day2")
          else if (cellEventId && cellEventId.startsWith(`${searchCriteria.eventId}-day`)) {
            isMatch = true;
          }
          
          // SAFETY: Also check other columns for event ID in case it's stored differently
          else {
            for (let colIndex = 0; colIndex < Math.min(row.length, 5); colIndex++) {
              const cellValue = row[colIndex];
              if (cellValue === searchCriteria.eventId || 
                  (cellValue && cellValue.startsWith && cellValue.startsWith(`${searchCriteria.eventId}-day`))) {
                isMatch = true;
                break;
              }
            }
          }
        }
        
        // Check for direct item ID match (for non-event items)
        if (searchCriteria.itemId && !isMatch) {
          const cellItemId = row[0]; // Item ID typically in column A
          if (cellItemId === searchCriteria.itemId) {
            isMatch = true;
          }
        }
        
        if (isMatch) {
          rowsToDelete.push(i);
        }
      }
    }
    
    if (rowsToDelete.length === 0) {
      return { deleted: false, message: `No matching rows found in ${sheetName}` };
    }
    
    // Get sheet ID for batch update
    const sheetId = await getSheetId(accessToken, spreadsheetId, sheetName);
    
    // Delete rows in reverse order (highest index first) to avoid index shifting
    const deleteRequests = [];
    
    // Sort in descending order to delete from bottom up
    const sortedRows = [...rowsToDelete].sort((a, b) => b - a);
    
    for (const rowIndex of sortedRows) {
      deleteRequests.push({
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex,
            endIndex: rowIndex + 1
          }
        }
      });
    }
    
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: deleteRequests
        }),
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete rows from sheet ${sheetName}: ${error}`);
    }
    
    return { deleted: true, message: `Successfully deleted ${rowsToDelete.length} rows from ${sheetName}` };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// FIXED: Comprehensive event deletion with more precise targeting
async function deleteEventComprehensively(
  supabase: any,
  accessToken: string, 
  spreadsheetId: string, 
  eventId: string, 
  eventData?: any
) {
  const results = [];
  
  // First, let's get the list of available sheets to avoid trying non-existent ones
  let availableSheets = [];
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    if (response.ok) {
      const spreadsheet = await response.json();
      availableSheets = spreadsheet.sheets.map((s: any) => s.properties.title);
    }
  } catch (error) {
    // Could not get sheet list, proceeding with default list
  }
  
  // List of all sheets that might contain event-related data
  const eventRelatedSheets = [
    'Master Events',    // Main events sheet - CRITICAL for event deletion
    'Wedding',          // Singular form as seen in logs
    'Weddings',         // Plural form fallback
    'Pre-Wedding', 
    'Pre-Weddings', 
    'Corporate',
    'Others',
    'Payments',
    'Tasks',
    'Staff Payments',
    'Freelancer Payments',
    'Expenses'          // Also check expenses sheet
  ];
  
  // Add event-type specific sheet if we know the event type
  if (eventData?.event_type) {
    const eventTypeSheet = eventData.event_type;
    if (!eventRelatedSheets.includes(eventTypeSheet)) {
      eventRelatedSheets.push(eventTypeSheet);
    }
  }
  
  // Only try to delete from sheets that actually exist
  const sheetsToCheck = availableSheets.length > 0 
    ? eventRelatedSheets.filter(sheet => availableSheets.includes(sheet))
    : eventRelatedSheets; // Fallback to trying all if we couldn't get the list
  
  // Delete from all relevant sheets with PRECISE matching
  for (const sheetName of sheetsToCheck) {
    try {
      const result = await deleteRowsFromSheet(
        accessToken,
        spreadsheetId,
        sheetName,
        { eventId: eventId }, // Only use exact event ID
        eventData
      );
      
      results.push({ sheet: sheetName, ...result });
      
    } catch (error) {
      results.push({ 
        sheet: sheetName, 
        deleted: false, 
        message: `Error: ${error.message}` 
      });
    }
  }
  
  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { itemType, itemId, firmId, eventData } = await req.json();
    
    if (!itemType || !itemId || !firmId) {
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
      return new Response(JSON.stringify({
        success: false,
        error: 'Firm not found or no Google Spreadsheet configured'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get Google authentication with timeout
    let accessToken: string;
    try {
      accessToken = await getGoogleAuth();
    } catch (error) {
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

    // Handle different item types with PRECISE deletion
    switch (itemType) {
      case 'event':
        deletionResult = await deleteEventComprehensively(supabase, accessToken, firm.spreadsheet_id, itemId, eventData);
        // Additionally remove all related payment rows by Payment ID to avoid leftovers
        try {
          const { data: paymentsForEvent } = await supabase
            .from('payments')
            .select('id')
            .eq('event_id', itemId);
          if (paymentsForEvent && paymentsForEvent.length > 0) {
            for (const p of paymentsForEvent) {
              await deleteRowsFromSheet(accessToken, firm.spreadsheet_id, 'Payments', { itemId: p.id });
            }
          }
        } catch (e) {
          // Could not remove related payments from Payments sheet
        }
        message = `Event ${itemId} and ONLY its related data deleted precisely from Google Sheets`;
        break;
      
      case 'payment':
        deletionResult = await deleteRowsFromSheet(accessToken, firm.spreadsheet_id, 'Payments', { itemId });
        message = `Payment deleted from Google Sheets`;
        break;
      
      case 'client':
        deletionResult = await deleteRowsFromSheet(accessToken, firm.spreadsheet_id, 'Clients', { itemId });
        message = `Client deleted from Google Sheets`;
        break;
      
      case 'task':
        deletionResult = await deleteRowsFromSheet(accessToken, firm.spreadsheet_id, 'Tasks', { itemId });
        message = `Task deleted from Google Sheets`;
        break;
      
      case 'expense':
        deletionResult = await deleteRowsFromSheet(accessToken, firm.spreadsheet_id, 'Expenses', { itemId });
        message = `Expense deleted from Google Sheets`;
        break;
      
      case 'staff':
        deletionResult = await deleteRowsFromSheet(accessToken, firm.spreadsheet_id, 'Staff', { itemId });
        message = `Staff deleted from Google Sheets`;
        break;
      
      case 'freelancer_payment':
        deletionResult = await deleteRowsFromSheet(accessToken, firm.spreadsheet_id, 'Freelancer Payments', { itemId });
        message = `Freelancer payment deleted from Google Sheets`;
        break;
      
      case 'staff_payment':
        deletionResult = await deleteRowsFromSheet(accessToken, firm.spreadsheet_id, 'Staff Payments', { itemId });
        message = `Staff payment deleted from Google Sheets`;
        break;
      
      case 'freelancer':
        deletionResult = await deleteRowsFromSheet(accessToken, firm.spreadsheet_id, 'Freelancers', { itemId });
        message = `Freelancer deleted from Google Sheets`;
        break;
      
      default:
        throw new Error(`Unsupported item type: ${itemType}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message,
      deletionResult,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${firm.spreadsheet_id}/edit`,
      precise_deletion: true,
      event_id_targeted: itemType === 'event' ? itemId : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
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
