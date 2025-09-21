// supabase/functions/sync-staff-to-google-direct/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { SignJWT } from 'https://deno.land/x/jose@v5.2.0/index.ts';
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { userId } = await req.json();
    if (!userId) throw new Error('User ID is required');
    // Get user profile
    const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
    if (profileError || !profile) throw new Error(`Profile not found for user: ${userId}`);
    // Get firm spreadsheet
    const { data: firm, error: firmError } = await supabase.from('firms').select('spreadsheet_id').eq('id', profile.firm_id).single();
    if (firmError || !firm?.spreadsheet_id) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No spreadsheet to sync to'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Parse service account credentials
    const googleCredentials = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!googleCredentials) throw new Error('Missing Google credentials');
    const credentials = JSON.parse(googleCredentials);
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };
    // Fix private key formatting
    let privateKeyPem = credentials.private_key.replace(/\\n/g, '\n');
    if (!privateKeyPem.includes('BEGIN PRIVATE KEY')) {
      privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${privateKeyPem}\n-----END PRIVATE KEY-----`;
    }
    // Convert PEM to CryptoKey
    const pemHeader = '-----BEGIN PRIVATE KEY-----';
    const pemFooter = '-----END PRIVATE KEY-----';
    const pemContents = privateKeyPem.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
    const binaryDer = Uint8Array.from(atob(pemContents), (c)=>c.charCodeAt(0));
    const privateKey = await crypto.subtle.importKey('pkcs8', binaryDer.buffer, {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    }, false, [
      'sign'
    ]);
    // Sign JWT
    const jwt = await new SignJWT(payload).setProtectedHeader({
      alg: 'RS256'
    }).setIssuedAt(now).setExpirationTime(now + 3600).sign(privateKey);
    // Get access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) throw new Error(`Google access token failed: ${JSON.stringify(tokenData)}`);
    // Check if staff already exists using profile data instead of just user ID
    const sheetCheckRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${firm.spreadsheet_id}/values/Staff!A:E`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    const sheetCheckData = await sheetCheckRes.json();
    const existingRows = sheetCheckData.values?.slice(1) || [];
    
    // Check for duplicates using multiple criteria: user_id, name, or mobile
    const isDuplicate = existingRows.some(row => {
      return row[0] === userId || // Same user ID
             (row[1] === profile.full_name && row[3] === profile.mobile_number); // Same name and mobile
    });
    
    if (isDuplicate) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Staff already exists in spreadsheet'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Add staff to sheet
    const staffData = [
      userId,
      profile.full_name || '',
      profile.role || '',
      profile.mobile_number || '',
      new Date().toISOString().split('T')[0],
      '' // Remarks
    ];
    const sheetAddRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${firm.spreadsheet_id}/values/Staff!A:F:append?valueInputOption=RAW`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [
          staffData
        ]
      })
    });
    if (!sheetAddRes.ok) {
      const errorText = await sheetAddRes.text();
      throw new Error(`Failed to append row: ${errorText}`);
    }

    const addResult = await sheetAddRes.json();
    const updatedRange = addResult.updates.updatedRange;
    const rowNumber = parseInt(updatedRange.split('!')[1].split(':')[0].replace(/[A-Z]/g, ''));

    // Get the correct sheet ID for Staff sheet
    const metadataResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${firm.spreadsheet_id}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const metadata = await metadataResponse.json();
    const staffSheet = metadata.sheets.find((s: any) => s.properties.title === 'Staff');
    const staffSheetId = staffSheet ? staffSheet.properties.sheetId : 0;

    // Apply Lexend font formatting to the newly added row with correct sheet ID
    const formatRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${firm.spreadsheet_id}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: staffSheetId,
                startRowIndex: rowNumber - 1,
                endRowIndex: rowNumber,
                startColumnIndex: 0,
                endColumnIndex: 6
              },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    fontFamily: "Lexend",
                    fontSize: 10
                  }
                }
              },
              fields: "userEnteredFormat.textFormat.fontFamily,userEnteredFormat.textFormat.fontSize"
            }
          }
        ]
      })
    });

    if (!formatRes.ok) {
      const formatError = await formatRes.text();
    } else {
      // Format applied successfully
    }
    return new Response(JSON.stringify({
      success: true,
      message: 'Staff added to sheet'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
