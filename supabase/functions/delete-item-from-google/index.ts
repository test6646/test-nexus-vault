
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

console.log('🗑️ Delete Item from Google Sheets function loaded');

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
  console.log(`📊 Getting sheet values for: ${sheetName}`);
  
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
      console.error(`❌ Failed to get sheet values for ${sheetName}:`, error);
      throw new Error(`Failed to get sheet values ${sheetName}: ${error}`);
    }
    
    const result = await response.json();
    const values = result.values || [];
    console.log(`📊 Sheet ${sheetName} has ${values.length} rows`);
    return values;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// OPTIMIZED: Delete row from Google Sheet with cached event data
async function deleteRowFromSheet(
  accessToken: string, 
  spreadsheetId: string, 
  sheetName: string, 
  eventId: string, 
  eventData?: any,
  timeoutMs = 10000
) {
  console.log(`🔍 Looking for Event ID: ${eventId} in sheet ${sheetName}`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    // Get existing data
    const existingData = await getSheetValues(accessToken, spreadsheetId, sheetName);
    
    // Debug: Log first few rows to see the data structure
    console.log(`📋 Sheet ${sheetName} structure:`, existingData.slice(0, 3));
    
    // Find rows to delete (skip header row) - may be multiple rows for multi-day events
    const rowsToDelete = [];
    
    for (let i = 1; i < existingData.length; i++) {
      const row = existingData[i];
      if (row && row.length > 0) {
        const cellEventId = row[0]; // Event ID is in column A (index 0)
        
        console.log(`🔍 Row ${i}: Event ID = "${cellEventId}" (comparing to "${eventId}")`);
        
        // ENHANCED: Match by exact Event ID OR event ID with multi-day suffix OR by cached event data
        let isMatch = cellEventId === eventId || 
                      (cellEventId && cellEventId.startsWith(`${eventId}-day`));
        
        // FALLBACK: If we have cached event data, also try matching by title
        if (!isMatch && eventData) {
          const cellTitle = row[1]; // Title is typically in column B
          if (cellTitle && eventData.client_name && cellTitle.includes(eventData.client_name)) {
            console.log(`🎯 FALLBACK: Found potential match by title: "${cellTitle}" contains "${eventData.client_name}"`);
            isMatch = true;
          }
        }
        
        if (isMatch) {
          rowsToDelete.push(i);
          console.log(`✅ Found match at row ${i}`);
        }
      }
    }
    
    if (rowsToDelete.length === 0) {
      console.log(`⚠️ Event ID ${eventId} not found in ${sheetName} sheet`);
      console.log(`🔍 Available Event IDs:`, existingData.slice(1, 6).map(row => row?.[0]));
      return { deleted: false, message: `Event not found in ${sheetName}` };
    }
    
    // Get sheet ID for batch update
    const sheetId = await getSheetId(accessToken, spreadsheetId, sheetName);
    console.log(`📋 Sheet ID for ${sheetName}: ${sheetId}`);
    
    // Delete rows in reverse order (highest index first) to avoid index shifting
    console.log(`🗑️ Deleting ${rowsToDelete.length} rows from ${sheetName}: ${rowsToDelete.map(r => r + 1).join(', ')}`);
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
      console.error(`❌ Failed to delete rows from ${sheetName}:`, error);
      throw new Error(`Failed to delete rows from sheet ${sheetName}: ${error}`);
    }
    
    console.log(`✅ Successfully deleted ${rowsToDelete.length} rows from ${sheetName} sheet`);
    return { deleted: true, message: `Successfully deleted ${rowsToDelete.length} rows from ${sheetName}` };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Delete client from Google Sheets
async function deleteClientFromSheet(accessToken: string, spreadsheetId: string, clientId: string) {
  return await deleteRowFromSheet(accessToken, spreadsheetId, 'Clients', clientId);
}

// Delete expense from Google Sheets
async function deleteExpenseFromSheet(accessToken: string, spreadsheetId: string, expenseId: string) {
  return await deleteRowFromSheet(accessToken, spreadsheetId, 'Expenses', expenseId);
}

// Delete task from Google Sheets
async function deleteTaskFromSheet(accessToken: string, spreadsheetId: string, taskId: string) {
  return await deleteRowFromSheet(accessToken, spreadsheetId, 'Tasks', taskId);
}

// Delete staff from Google Sheets
async function deleteStaffFromSheet(accessToken: string, spreadsheetId: string, staffId: string) {
  return await deleteRowFromSheet(accessToken, spreadsheetId, 'Staff', staffId);
}

// OPTIMIZED: Delete event from Google Sheets with optional cached data
async function deleteEventFromSheet(
  supabase: any, 
  accessToken: string, 
  spreadsheetId: string, 
  eventId: string, 
  eventData?: any
) {
  console.log(`🗑️ Starting OPTIMIZED Google Sheets deletion for event: ${eventId}`);
  
  let event = null;
  
  // Try to get event details first (if not provided in eventData)
  if (!eventData) {
    console.log('📋 Fetching event details from database...');
    try {
      const { data: eventFromDb, error: eventError } = await supabase
        .from('events')
        .select('event_type, title')
        .eq('id', eventId)
        .single();

      if (!eventError && eventFromDb) {
        event = eventFromDb;
        console.log(`📋 Event found in DB: ${event.title} (${event.event_type})`);
      }
    } catch (dbError) {
      console.warn('⚠️ Could not fetch event from database (may already be deleted):', dbError);
    }
  } else {
    // Use provided event data
    event = {
      event_type: eventData.event_type,
      title: eventData.title || eventData.client_name
    };
    console.log(`📋 Using cached event data: ${event.title} (${event.event_type})`);
  }
  
  const results = [];
  
  // Delete from Master Events sheet using Event ID directly
  console.log('🗑️ Deleting from Master Events sheet...');
  try {
    const masterResult = await deleteRowFromSheet(
      accessToken, 
      spreadsheetId, 
      'Master Events', 
      eventId, 
      eventData
    );
    results.push({ sheet: 'Master Events', ...masterResult });
    console.log('✅ Master Events deletion result:', masterResult);
  } catch (error) {
    console.error('❌ Failed to delete from Master Events:', error);
    results.push({ sheet: 'Master Events', deleted: false, message: error.message });
  }
  
  // Delete from specific event type sheet if event type is known
  if (event?.event_type) {
    const eventTypeSheet = event.event_type === 'Others' ? 'Others' : event.event_type;
    console.log(`🗑️ Deleting from ${eventTypeSheet} sheet...`);
    
    try {
      const typeResult = await deleteRowFromSheet(
        accessToken, 
        spreadsheetId, 
        eventTypeSheet, 
        eventId, 
        eventData
      );
      results.push({ sheet: eventTypeSheet, ...typeResult });
      console.log(`✅ ${eventTypeSheet} deletion result:`, typeResult);
    } catch (error) {
      console.error(`❌ Failed to delete from ${eventTypeSheet}:`, error);
      results.push({ sheet: eventTypeSheet, deleted: false, message: error.message });
    }
  }
  
  console.log('🏁 OPTIMIZED Google Sheets deletion completed:', results);
  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    console.log('🗑️ Starting OPTIMIZED deletion from Google Sheets...');
    const { itemType, itemId, firmId, eventData } = await req.json();
    
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

    // Get Google authentication with timeout
    let accessToken: string;
    try {
      console.log('🔐 Getting Google auth with timeout...');
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

    // Delete based on item type with optimizations
    switch (itemType) {
      case 'client':
        deletionResult = await deleteClientFromSheet(accessToken, firm.spreadsheet_id, itemId);
        message = `Client deleted from Google Sheets`;
        break;
      
      case 'event':
        console.log('🎯 OPTIMIZED event deletion with cached data:', eventData ? 'Available' : 'Not available');
        deletionResult = await deleteEventFromSheet(supabase, accessToken, firm.spreadsheet_id, itemId, eventData);
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
    console.error('💥 Unexpected error in OPTIMIZED deletion:', error);
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
