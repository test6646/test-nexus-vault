
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

console.log('💰 Payment Sync to Google Sheets function loaded');

// Google Auth helper function with timeout
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
  
  // Exchange JWT for access token with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
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
async function getSheetId(accessToken: string, spreadsheetId: string, sheetName: string): Promise<number> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
  
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
      // Return null instead of throwing error - sheet might not exist yet
      return null;
    }
    
    return sheet.properties.sheetId;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Helper function to get all values from a sheet with timeout
async function getSheetValues(accessToken: string, spreadsheetId: string, sheetName: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
  
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
      // If sheet doesn't exist, return empty array
      if (response.status === 400) {
        console.log(`Sheet "${sheetName}" does not exist, will be created if needed`);
        return [];
      }
      const error = await response.text();
      throw new Error(`Failed to get sheet values ${sheetName}: ${error}`);
    }
    
    const result = await response.json();
    return result.values || [];
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn(`Could not read sheet ${sheetName}:`, error);
    return [];
  }
}

// Helper function to create Payments sheet if it doesn't exist with timeout
async function ensurePaymentsSheetExists(accessToken: string, spreadsheetId: string) {
  try {
    const sheetId = await getSheetId(accessToken, spreadsheetId, 'Payments');
    if (sheetId !== null) {
      console.log('✅ Payments sheet already exists');
      return sheetId;
    }

    // Create the Payments sheet with timeout
    console.log('📝 Creating Payments sheet...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
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
            addSheet: {
              properties: {
                title: 'Payments',
                sheetType: 'GRID',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 10
                }
              }
            }
          }]
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to create Payments sheet: ${await response.text()}`);
    }

    const result = await response.json();
    const newSheetId = result.replies[0].addSheet.properties.sheetId;

    // Add headers to the new sheet with timeout
    const headers = [
      'Payment ID',
      'Client Name', 
      'Event Name',
      'Payment Amount',
      'Payment Method',
      'Payment Date',
      'Reference Number',
      'Notes',
      'Created Date'
    ];

    const headerController = new AbortController();
    const headerTimeoutId = setTimeout(() => headerController.abort(), 8000);

    const headerResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [{
            updateCells: {
              range: {
                sheetId: newSheetId,
                startRowIndex: 0,
                startColumnIndex: 0,
                endRowIndex: 1,
                endColumnIndex: headers.length
              },
              rows: [{
                values: headers.map(header => ({
                  userEnteredValue: { stringValue: header },
                  userEnteredFormat: {
                    textFormat: {
                      fontFamily: 'Lexend',
                      fontSize: 12,
                      bold: true
                    },
                    backgroundColor: {
                      red: 0.9,
                      green: 0.9,
                      blue: 0.9
                    }
                  }
                }))
              }],
              fields: 'userEnteredValue,userEnteredFormat'
            }
          }]
        }),
        signal: headerController.signal
      }
    );

    clearTimeout(headerTimeoutId);

    if (!headerResponse.ok) {
      console.warn('Failed to add headers to Payments sheet');
    }

    console.log('✅ Payments sheet created successfully');
    return newSheetId;
  } catch (error) {
    console.error('Failed to ensure Payments sheet exists:', error);
    throw error;
  }
}

// Helper function to update or append payment data to sheet with font formatting and timeout
async function updateOrAppendPaymentToSheet(accessToken: string, spreadsheetId: string, sheetName: string, newData: any[], paymentId: string) {
  try {
    // Ensure the sheet exists
    await ensurePaymentsSheetExists(accessToken, spreadsheetId);
    
    // Get existing data
    const existingData = await getSheetValues(accessToken, spreadsheetId, sheetName);
    
    // Find if payment exists (skip header row) - match by payment ID
    let rowIndex = -1;
    
    for (let i = 1; i < existingData.length; i++) {
      if (existingData[i] && existingData[i][0] === paymentId) {
        rowIndex = i + 1; // Google Sheets is 1-indexed
        break;
      }
    }
    
    // Get sheet ID for batch update
    const sheetId = await getSheetId(accessToken, spreadsheetId, sheetName);
    
    // Prepare formatted data with Lexend font
    const formattedRow = [{
      values: newData.map(cell => ({
        userEnteredValue: { stringValue: String(cell || '') },
        userEnteredFormat: {
          textFormat: {
            fontFamily: 'Lexend',
            fontSize: 10
          }
        }
      }))
    }];
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      if (rowIndex > 0) {
        // Update existing record
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
                updateCells: {
                  range: {
                    sheetId: sheetId,
                    startRowIndex: rowIndex - 1, // Convert to 0-indexed
                    startColumnIndex: 0,
                    endRowIndex: rowIndex
                  },
                  rows: formattedRow,
                  fields: 'userEnteredValue,userEnteredFormat.textFormat'
                }
              }]
            }),
            signal: controller.signal
          }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to update sheet ${sheetName}: ${error}`);
        }
        
        console.log(`✅ Updated existing payment in ${sheetName} at row ${rowIndex} with Lexend font`);
        return await response.json();
      } else {
        // Append new record at the end
        const nextRow = existingData.length + 1; // Next available row
        
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
                updateCells: {
                  range: {
                    sheetId: sheetId,
                    startRowIndex: nextRow - 1, // Convert to 0-indexed
                    startColumnIndex: 0,
                    endRowIndex: nextRow
                  },
                  rows: formattedRow,
                  fields: 'userEnteredValue,userEnteredFormat.textFormat'
                }
              }]
            }),
            signal: controller.signal
          }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to append to sheet ${sheetName}: ${error}`);
        }
        
        console.log(`✅ Added new payment to ${sheetName} at row ${nextRow} with Lexend font`);
        return await response.json();
      }
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    console.error(`❌ Error updating payment sheet ${sheetName}:`, error);
    throw error;
  }
}

// Add single payment to Google Sheets and update event amounts
async function addPaymentToSheet(supabase: any, accessToken: string, spreadsheetId: string, paymentId: string) {
  const { data: payment, error } = await supabase
    .from('payments')
    .select(`
      *,
      event:events(
        id,
        title,
        total_amount,
        advance_amount,
        balance_amount,
        clients(name)
      )
    `)
    .eq('id', paymentId)
    .single();

  if (error || !payment) {
    throw new Error(`Payment not found: ${error?.message}`);
  }

  console.log(`💰 Payment found: ₹${payment.amount} for event ${payment.event?.title || 'Unknown'}`);

  // CRITICAL: Get updated event amounts after payment
  const { data: updatedEvent, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', payment.event_id)
    .single();

  if (eventError) {
    console.warn('⚠️ Could not fetch updated event amounts:', eventError);
  }

  const currentAdvance = updatedEvent?.advance_amount || payment.event?.advance_amount || 0;
  const currentBalance = updatedEvent?.balance_amount || payment.event?.balance_amount || 0;

  // Payment data for Payments sheet
  const paymentData = [
    payment.id,                                         // Payment ID
    payment.event?.clients?.name || 'Unknown Client',  // Client Name
    payment.event?.title || 'Unknown Event',           // Event Name
    payment.amount,                                     // Payment Amount
    payment.payment_method || 'Cash',                   // Payment Method
    payment.payment_date || payment.created_at.split('T')[0], // Payment Date
    payment.reference_number || '',                     // Reference Number
    payment.notes || '',                               // Notes
    payment.created_at.split('T')[0]                   // Created Date
  ];

  // Add to Payments sheet
  await updateOrAppendPaymentToSheet(accessToken, spreadsheetId, 'Payments', paymentData, payment.id);
  console.log(`✅ Synced payment ₹${payment.amount} to Payments sheet`);

  // CRITICAL: Also trigger event sync to update amounts in Master Events (non-blocking)
  if (payment.event_id) {
    console.log(`🔄 Triggering event sync to update amounts in Master Events...`);
    
    // Call the event sync function to update the Master Events sheet with new amounts (with timeout)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const eventSyncResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-event-to-google`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventId: payment.event_id
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (eventSyncResponse.ok) {
        console.log(`✅ Event amounts updated in Master Events sheet`);
      } else {
        console.warn(`⚠️ Failed to update event amounts: ${await eventSyncResponse.text()}`);
      }
    } catch (syncError) {
      console.warn(`⚠️ Event sync failed:`, syncError);
    }
  }

  return payment;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    console.log('💰 Starting payment sync to Google Sheets...');
    const { paymentId, firmId } = await req.json();
    
    if (!paymentId || !firmId) {
      console.error('❌ Payment ID and Firm ID are required');
      return new Response(JSON.stringify({
        success: false,
        error: 'paymentId and firmId are required'
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

    // Sync payment to sheets
    const syncedPayment = await addPaymentToSheet(supabase, accessToken, firm.spreadsheet_id, paymentId);

    return new Response(JSON.stringify({
      success: true,
      message: `Payment of ₹${syncedPayment.amount} synced to Google Sheets and event amounts updated`,
      syncedPayment,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${firm.spreadsheet_id}/edit`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Payment sync error:', error);
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
