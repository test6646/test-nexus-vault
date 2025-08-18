
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Extract spreadsheet ID from URL or return as-is if it's already an ID
function extractSpreadsheetId(input: string): string {
  if (input.startsWith('https://')) {
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      return match[1];
    }
    throw new Error('Invalid Google Sheets URL format');
  }
  return input;
}

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
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/calendar',
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

// Create Google Calendar
async function createGoogleCalendar(accessToken: string, firmName: string, calendarEmail: string) {
  const calendarName = `Studio Events - ${firmName}`;
  
  const calendarData = {
    summary: calendarName,
    description: `Photography studio calendar for ${firmName}`,
    timeZone: 'Asia/Kolkata'
  };
  
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(calendarData)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create calendar: ${error}`);
  }
  
  const calendar = await response.json();
  console.log('✅ Calendar created:', calendar.id);
  
  // Share calendar with the provided email
  await shareCalendar(accessToken, calendar.id, calendarEmail);
  
  return {
    calendarId: calendar.id,
    calendarLink: `https://calendar.google.com/calendar/u/0/r?cid=${calendar.id}`,
    calendarName: calendarName
  };
}

// Share calendar with specific email
async function shareCalendar(accessToken: string, calendarId: string, email: string) {
  const aclRule = {
    role: 'writer',
    scope: {
      type: 'user',
      value: email
    }
  };
  
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/acl`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(aclRule)
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    console.warn(`Failed to share calendar: ${error}`);
    // Don't throw error as calendar creation was successful
  } else {
    console.log('✅ Calendar shared with:', email);
  }
}

async function createSheetsInSpreadsheet(accessToken: string, spreadsheetId: string) {
  const sheetsToCreate = [
    { title: 'Clients', index: 0 },
    { title: 'Master Events', index: 1 },
    { title: 'Ring-Ceremony', index: 2 },
    { title: 'Pre-Wedding', index: 3 },
    { title: 'Wedding', index: 4 },
    { title: 'Maternity Photography', index: 5 },
    { title: 'Others', index: 6 },
    { title: 'Staff', index: 7 },
    { title: 'Tasks', index: 8 },
    { title: 'Expenses', index: 9 },
    { title: 'Freelancers', index: 10 },
    { title: 'Payments', index: 11 },
    { title: 'Reports', index: 12 },
    { title: 'Master Events Backup', index: 13 }
  ];
  
  const requests = sheetsToCreate.map(sheet => ({
    addSheet: {
      properties: {
        title: sheet.title,
        index: sheet.index
      }
    }
  }));
  
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create sheets: ${error}`);
  }
  
  const result = await response.json();
  
  // Extract sheet IDs and return mapping
  const sheetMapping: { [key: string]: number } = {};
  result.replies.forEach((reply: any, index: number) => {
    if (reply.addSheet) {
      sheetMapping[sheetsToCreate[index].title] = reply.addSheet.properties.sheetId;
    }
  });
  
  return sheetMapping;
}

import { SHEET_HEADERS } from '../shared/sheet-headers.ts';

async function setupSheetHeaders(accessToken: string, spreadsheetId: string, sheetMapping: { [key: string]: number }) {
  // Use centralized headers with proper ID columns at the start
  const clientsHeaders = SHEET_HEADERS.CLIENTS;
  const eventHeaders = SHEET_HEADERS.MASTER_EVENTS;
  const staffHeaders = SHEET_HEADERS.STAFF;
  const tasksHeaders = SHEET_HEADERS.TASKS;
  const expensesHeaders = SHEET_HEADERS.EXPENSES;
  
  const reportsHeaders = [
    'Month', 'Total Events', 'Total Revenue', 'Total Expenses', 'Profit', 'Most Booked Event Type',
    'Top City', 'Most Booked Photographer', 'Most Booked Cinematographer', 'New Clients Acquired',
    'Repeat Clients', 'Lead Conversion Rate'
  ];
  
  const requests = [];
  
  // Helper function to create header request with Lexend font and no background
  const createHeaderRequest = (sheetId: number, headers: string[]) => ({
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
            textFormat: { 
              fontFamily: "Lexend",
              fontSize: 12,
              bold: true 
            }
          }
        }))
      }],
      fields: 'userEnteredValue,userEnteredFormat'
    }
  });
  
  // Add headers for Clients sheet - WITH CLIENT ID AT START
  if (sheetMapping['Clients']) {
    requests.push(createHeaderRequest(sheetMapping['Clients'], SHEET_HEADERS.CLIENTS));
  }
  
  // Add headers for all event sheets - WITH CLIENT ID AT START
  const eventSheets = ['Master Events', 'Ring-Ceremony', 'Pre-Wedding', 'Wedding', 'Maternity Photography', 'Others', 'Master Events Backup'];
  eventSheets.forEach(sheetName => {
    if (sheetMapping[sheetName]) {
      requests.push(createHeaderRequest(sheetMapping[sheetName], SHEET_HEADERS.MASTER_EVENTS));
    }
  });
  
  // Add headers for Staff sheet - WITH STAFF ID AT START
  if (sheetMapping['Staff']) {
    requests.push(createHeaderRequest(sheetMapping['Staff'], SHEET_HEADERS.STAFF));
  }

  // Add headers for Tasks sheet - WITH TASK ID AT START
  if (sheetMapping['Tasks']) {
    requests.push(createHeaderRequest(sheetMapping['Tasks'], SHEET_HEADERS.TASKS));
  }
  
  // Add headers for Expenses sheet - WITH EXPENSE ID AT START
  if (sheetMapping['Expenses']) {
    requests.push(createHeaderRequest(sheetMapping['Expenses'], SHEET_HEADERS.EXPENSES));
  }
  
  // Add headers for Freelancers sheet - WITH FREELANCER ID AT START
  if (sheetMapping['Freelancers']) {
    requests.push(createHeaderRequest(sheetMapping['Freelancers'], SHEET_HEADERS.FREELANCERS));
  }
  
  // Add headers for Payments sheet - WITH PAYMENT ID AT START
  if (sheetMapping['Payments']) {
    requests.push(createHeaderRequest(sheetMapping['Payments'], SHEET_HEADERS.PAYMENTS));
  }
  
  // Add headers for Reports sheet
  if (sheetMapping['Reports']) {
    requests.push(createHeaderRequest(sheetMapping['Reports'], reportsHeaders));
  }
  
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to setup sheet headers: ${error}`);
  }
  
  return await response.json();
}

async function setupDataValidation(accessToken: string, spreadsheetId: string, sheetMapping: { [key: string]: number }) {
  const requests = [];
  
  // Create named ranges for dropdowns
  const namedRanges = [
    {
      name: 'EVENT_TYPES',
      range: {
        sheetId: sheetMapping['Master Events'],
        startRowIndex: 1000,
        endRowIndex: 1005,
        startColumnIndex: 20,
        endColumnIndex: 21
      }
    },
    {
      name: 'PAYMENT_STATUS',
      range: {
        sheetId: sheetMapping['Master Events'],
        startRowIndex: 1010,
        endRowIndex: 1013,
        startColumnIndex: 20,
        endColumnIndex: 21
      }
    },
    {
      name: 'DELIVERY_STATUS',
      range: {
        sheetId: sheetMapping['Master Events'],
        startRowIndex: 1020,
        endRowIndex: 1023,
        startColumnIndex: 20,
        endColumnIndex: 21
      }
    }
  ];
  
  // Add the named ranges first
  requests.push({
    addNamedRange: {
      namedRange: {
        name: 'EVENT_TYPES',
        range: {
          sheetId: sheetMapping['Master Events'],
          startRowIndex: 1000,
          endRowIndex: 1005,
          startColumnIndex: 20,
          endColumnIndex: 21
        }
      }
    }
  });
  
  // Add data to the named ranges
  const eventTypes = ['Ring-Ceremony', 'Pre-Wedding', 'Wedding', 'Maternity Photography', 'Others'];
  const paymentStatuses = ['Pending', 'Partially Paid', 'Paid'];
  const deliveryStatuses = ['Not Started', 'In Progress', 'Delivered'];
  
  // Add event types data
  requests.push({
    updateCells: {
      range: {
        sheetId: sheetMapping['Master Events'],
        startRowIndex: 1000,
        endRowIndex: 1005,
        startColumnIndex: 20,
        endColumnIndex: 21
      },
      rows: eventTypes.map(type => ({
        values: [{ userEnteredValue: { stringValue: type } }]
      })),
      fields: 'userEnteredValue'
    }
  });
  
  // Add payment status data
  requests.push({
    updateCells: {
      range: {
        sheetId: sheetMapping['Master Events'],
        startRowIndex: 1010,
        endRowIndex: 1013,
        startColumnIndex: 20,
        endColumnIndex: 21
      },
      rows: paymentStatuses.map(status => ({
        values: [{ userEnteredValue: { stringValue: status } }]
      })),
      fields: 'userEnteredValue'
    }
  });
  
  // Add delivery status data
  requests.push({
    updateCells: {
      range: {
        sheetId: sheetMapping['Master Events'],
        startRowIndex: 1020,
        endRowIndex: 1023,
        startColumnIndex: 20,
        endColumnIndex: 21
      },
      rows: deliveryStatuses.map(status => ({
        values: [{ userEnteredValue: { stringValue: status } }]
      })),
      fields: 'userEnteredValue'
    }
  });
  
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    console.warn(`Failed to setup data validation: ${error}`);
  } else {
    console.log('✅ Data validation setup completed');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    console.log('🚀 Starting firm creation with comprehensive Google Sheets setup...');
    const { firmName, spreadsheetInput, calendarEmail } = await req.json();
    
    console.log('📋 Request details:', {
      firmName,
      spreadsheetInput,
      calendarEmail
    });

    if (!firmName) {
      console.error('❌ Firm name is required');
      return new Response(JSON.stringify({
        success: false,
        error: 'Firm name is required',
        phase: 'validation'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!spreadsheetInput) {
      console.error('❌ Spreadsheet ID or URL is required');
      return new Response(JSON.stringify({
        success: false,
        error: 'Google Spreadsheet ID or URL is required',
        phase: 'validation'
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
        error: 'Server configuration error: Missing Supabase credentials',
        phase: 'server_config'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ Authorization header required');
      return new Response(JSON.stringify({
        success: false,
        error: 'Authorization required',
        phase: 'authentication'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('❌ Invalid authentication token:', userError?.message);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid authentication token',
        phase: 'authentication'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ User authenticated:', user.id);

    // Check if user profile exists and has admin role
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileCheckError) {
      console.error('❌ Error checking user profile:', profileCheckError.message);
      return new Response(JSON.stringify({
        success: false,
        error: 'Profile verification failed',
        phase: 'profile_check'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!existingProfile) {
      console.error('❌ User profile not found for:', user.id);
      return new Response(JSON.stringify({
        success: false,
        error: 'User profile not found. Please complete your profile setup first.',
        phase: 'profile_check'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ User profile found:', existingProfile.full_name, existingProfile.role);

    // Verify user has admin role
    if (existingProfile.role !== 'Admin') {
      console.error('❌ User is not an admin:', existingProfile.role);
      return new Response(JSON.stringify({
        success: false,
        error: 'Only admin users can create firms',
        phase: 'authorization'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract spreadsheet ID from input
    let spreadsheetId: string;
    try {
      spreadsheetId = extractSpreadsheetId(spreadsheetInput);
      console.log('✅ Extracted spreadsheet ID:', spreadsheetId);
    } catch (error) {
      console.error('❌ Invalid spreadsheet input:', error.message);
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        phase: 'spreadsheet_validation'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PHASE 1: Get Google Authentication
    console.log('🔐 PHASE 1: Getting Google authentication...');
    let accessToken: string;
    try {
      accessToken = await getGoogleAuth();
      console.log('✅ Google authentication successful');
    } catch (error) {
      console.error('❌ Google authentication failed:', error.message);
      return new Response(JSON.stringify({
        success: false,
        error: `Google authentication failed: ${error.message}`,
        phase: 'google_auth'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PHASE 2: Setup Google Sheets
    console.log('📊 PHASE 2: Setting up comprehensive Google Sheets structure...');
    try {
      // Create sheets in the spreadsheet
      const sheetMapping = await createSheetsInSpreadsheet(accessToken, spreadsheetId);
      console.log('✅ Created sheets in spreadsheet with IDs:', sheetMapping);
      
      // Setup headers for the sheets
      await setupSheetHeaders(accessToken, spreadsheetId, sheetMapping);
      console.log('✅ Setup comprehensive sheet headers');
      
      // Setup data validation and dropdowns
      await setupDataValidation(accessToken, spreadsheetId, sheetMapping);
      console.log('✅ Setup data validation and dropdowns');
    } catch (error) {
      console.error('❌ Google Sheets setup failed:', error.message);
      return new Response(JSON.stringify({
        success: false,
        error: `Google Sheets setup failed: ${error.message}`,
        phase: 'sheets_setup'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PHASE 3: Create Google Calendar
    console.log('📅 PHASE 3: Creating Google Calendar...');
    let calendarData: any;
    try {
      calendarData = await createGoogleCalendar(accessToken, firmName, calendarEmail);
      console.log('✅ Calendar created:', calendarData);
    } catch (error) {
      console.error('❌ Google Calendar creation failed:', error.message);
      return new Response(JSON.stringify({
        success: false,
        error: `Google Calendar creation failed: ${error.message}`,
        phase: 'calendar_creation'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PHASE 4: Create firm in database
    console.log('💾 PHASE 4: Creating firm in database...');
    try {
      const { data: firm, error: firmError } = await supabase
        .from('firms')
        .insert({
          name: firmName,
          created_by: user.id,
          spreadsheet_id: spreadsheetId,
          calendar_id: calendarData.calendarId
        })
        .select()
        .single();

      if (firmError) {
        console.error('❌ Firm creation failed:', firmError);
        throw new Error(`Database error: ${firmError.message}`);
      }

      console.log('✅ Firm created successfully:', firm.id);

      // PHASE 5: Update user profile
      console.log('👤 PHASE 5: Updating user profile...');
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          firm_id: firm.id,
          current_firm_id: firm.id
        })
        .eq('user_id', user.id);

      if (profileError) {
        console.warn('⚠️ Profile update failed:', profileError.message);
      } else {
        console.log('✅ User profile updated');
      }

      // Success response
      return new Response(JSON.stringify({
        success: true,
        firmId: firm.id,
        firm: {
          id: firm.id,
          name: firm.name,
          spreadsheet_id: firm.spreadsheet_id,
          calendar_id: firm.calendar_id,
          created_at: firm.created_at
        },
        message: `${firmName} created successfully with comprehensive Google Sheets and Calendar integration!`,
        integrations: {
          spreadsheet: {
            spreadsheetId: spreadsheetId,
            sheetsCreated: [
              'Clients',
              'Master Events',
              'Ring Ceremony',
              'Pre-Wedding',
              'Wedding',
              'Maternity',
              'Others',
              'Tasks',
              'Expenses',
              'Reports',
              'Master Events Backup'
            ],
            features: [
              'Comprehensive headers for all business operations',
              'Event-specific sheets for each service type',
              'Client management with contact details',
              'Task tracking for post-event follow-ups',
              'Expense tracking with event linking',
              'Reports and analytics sheet',
              'Data validation and dropdown menus',
              'Master Events backup for data safety'
            ]
          },
          calendar: {
            calendarId: calendarData.calendarId,
            calendarName: calendarData.calendarName,
            calendarLink: calendarData.calendarLink,
            sharedWith: calendarEmail
          }
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (dbError) {
      console.error('💥 Database operation failed:', dbError);
      return new Response(JSON.stringify({
        success: false,
        error: `Firm creation failed: ${dbError.message}`,
        phase: 'database_creation'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error.message,
      phase: 'unexpected_error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
