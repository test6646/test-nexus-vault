import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

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
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
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

// Create a new Google Spreadsheet with proper structure
async function createSpreadsheet(accessToken: string, firmName: string) {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: `${firmName} - Studio Management`,
        locale: 'en_US'
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create spreadsheet: ${error}`);
  }

  return await response.json();
}

import { ALL_SHEETS } from '../shared/sheet-headers.ts';

// Add all required sheets with proper headers and formatting - USING CENTRALIZED CONFIG
async function setupSheets(accessToken: string, spreadsheetId: string) {
  const sheets = ALL_SHEETS;

  // First, get existing sheets
  const metadataResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );
  
  const metadata = await metadataResponse.json();
  const existingSheets = metadata.sheets.map((s: any) => s.properties.title);

  // Create batch requests for new sheets and formatting
  const requests = [];

  // Add sheets that don't exist
  for (const sheet of sheets) {
    if (!existingSheets.includes(sheet.name)) {
      requests.push({
        addSheet: {
          properties: {
            title: sheet.name,
            gridProperties: {
              rowCount: 1000,
              columnCount: 26
            }
          }
        }
      });
    }
  }

  // Execute sheet creation
  if (requests.length > 0) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });
  }

  // Now add headers and formatting to all sheets
  for (const sheet of sheets) {
    await setupSheetHeaders(accessToken, spreadsheetId, sheet.name, sheet.headers);
  }

  console.log('✅ All sheets created and formatted successfully');
}

// Setup headers for a specific sheet with Lexend font
async function setupSheetHeaders(accessToken: string, spreadsheetId: string, sheetName: string, headers: string[]) {
  // Get sheet ID
  const metadataResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );
  
  const metadata = await metadataResponse.json();
  const sheet = metadata.sheets.find((s: any) => s.properties.title === sheetName);
  const sheetId = sheet.properties.sheetId;

  // Format headers with Lexend font, bold, and background color
  const headerFormattingRequest = {
    requests: [
      {
        updateCells: {
          range: {
            sheetId: sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: headers.length
          },
          rows: [{
            values: headers.map(header => ({
              userEnteredValue: { stringValue: header },
              userEnteredFormat: {
                backgroundColor: { red: 0.2, green: 0.6, blue: 1.0, alpha: 0.2 },
                textFormat: {
                  fontFamily: 'Lexend',
                  fontSize: 11,
                  bold: true,
                  foregroundColor: { red: 0.1, green: 0.1, blue: 0.1, alpha: 1 }
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            }))
          }],
          fields: 'userEnteredValue,userEnteredFormat'
        }
      },
      {
        autoResizeDimensions: {
          dimensions: {
            sheetId: sheetId,
            dimension: 'COLUMNS',
            startIndex: 0,
            endIndex: headers.length
          }
        }
      },
      {
        updateSheetProperties: {
          properties: {
            sheetId: sheetId,
            gridProperties: {
              frozenRowCount: 1
            }
          },
          fields: 'gridProperties.frozenRowCount'
        }
      }
    ]
  };

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(headerFormattingRequest)
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to format ${sheetName}:`, error);
  } else {
    console.log(`✅ Headers set up for ${sheetName} with Lexend font`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🚀 Setting up Google Spreadsheet...');
    const { firmId, firmName } = await req.json();
    
    if (!firmId || !firmName) {
      return new Response(JSON.stringify({
        success: false,
        error: 'firmId and firmName are required'
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

    // Get Google authentication
    const accessToken = await getGoogleAuth();
    console.log('✅ Google authentication successful');

    // Create new spreadsheet
    const spreadsheet = await createSpreadsheet(accessToken, firmName);
    console.log('✅ Spreadsheet created:', spreadsheet.properties.title);

    // Setup all sheets with headers and formatting
    await setupSheets(accessToken, spreadsheet.spreadsheetId);

    // Update firm with new spreadsheet ID
    const { error: updateError } = await supabase
      .from('firms')
      .update({ spreadsheet_id: spreadsheet.spreadsheetId })
      .eq('id', firmId);

    if (updateError) {
      throw new Error(`Failed to update firm: ${updateError.message}`);
    }

    console.log('✅ Firm updated with spreadsheet ID');

    return new Response(JSON.stringify({
      success: true,
      spreadsheetId: spreadsheet.spreadsheetId,
      spreadsheetUrl: spreadsheet.spreadsheetUrl,
      message: 'Google Spreadsheet setup completed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Setup failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});