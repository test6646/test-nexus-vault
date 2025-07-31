
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

// Helper function to clear and update sheet data with Lexend font while preserving headers
async function updateSheetData(accessToken: string, spreadsheetId: string, sheetName: string, values: any[][]) {
  // Clear only data rows (not headers)
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}:clear`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: `${sheetName}!A2:Z`
      })
    }
  );

  // Add the data with Lexend font formatting (starting from row 2 to preserve headers)
  if (values.length > 0) {
    const formattedRows = values.map(row => ({
      values: row.map(cell => ({
        userEnteredValue: { stringValue: String(cell || '') },
        userEnteredFormat: {
          textFormat: {
            fontFamily: 'Lexend',
            fontSize: 10
          }
        }
      }))
    }));

    const sheetId = await getSheetId(accessToken, spreadsheetId, sheetName);
    console.log(`🎨 Applying Lexend font to ${sheetName} sheet (ID: ${sheetId}) for ${values.length} rows`);
    
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
                startRowIndex: 1, // Start from row 2 (skip header)
                startColumnIndex: 0
              },
              rows: formattedRows,
              fields: 'userEnteredValue,userEnteredFormat.textFormat'
            }
          }]
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Failed to apply Lexend font to ${sheetName}:`, error);
      throw new Error(`Failed to update ${sheetName}: ${error}`);
    } else {
      console.log(`✅ Successfully applied Lexend font to ${sheetName} sheet`);
    }
  }
}

// Sync clients to Google Sheets (NO ID)
async function syncClients(supabase: any, accessToken: string, spreadsheetId: string, firmId: string) {
  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch clients: ${error.message}`);
  }

  // Client data WITH ID to match headers
  const clientsData = clients.map((client: any) => [
    client.id,
    client.name,
    client.phone,
    client.email || '',
    client.address || '',
    client.notes || ''
  ]);

  await updateSheetData(accessToken, spreadsheetId, 'Clients', clientsData);
  console.log(`✅ Synced ${clients.length} clients to Google Sheets`);
  return clients.length;
}

// Sync events to Google Sheets (NO ID, matches your 16 headers)
async function syncEvents(supabase: any, accessToken: string, spreadsheetId: string, firmId: string) {
  const { data: events, error } = await supabase
    .from('events')
    .select(`
      *,
      clients(name),
      photographer:profiles!photographer_id(full_name),
      videographer:profiles!videographer_id(full_name),
      editor:profiles!editor_id(full_name),
      same_day_editor:profiles!same_day_editor_id(full_name)
    `)
    .eq('firm_id', firmId)
    .order('event_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch events: ${error.message}`);
  }

  // Get all staff assignments for these events
  const eventIds = events.map((event: any) => event.id);
  const { data: staffAssignments, error: staffError } = await supabase
    .from('event_staff_assignments')
    .select(`
      event_id,
      role,
      profiles!event_staff_assignments_staff_id_fkey(full_name)
    `)
    .in('event_id', eventIds)
    .in('role', ['Photographer', 'Videographer']);

  if (staffError) {
    console.error('Failed to fetch staff assignments:', staffError);
  }

  // Group staff assignments by event and role
  const staffByEvent = (staffAssignments || []).reduce((acc: any, assignment: any) => {
    if (!acc[assignment.event_id]) {
      acc[assignment.event_id] = { photographers: [], videographers: [] };
    }
    
    if (assignment.role === 'Photographer' && assignment.profiles?.full_name) {
      acc[assignment.event_id].photographers.push(assignment.profiles.full_name);
    } else if (assignment.role === 'Videographer' && assignment.profiles?.full_name) {
      acc[assignment.event_id].videographers.push(assignment.profiles.full_name);
    }
    
    return acc;
  }, {});

  // Event data to match your EXACT 16 headers (NO ID)
  const allEventsData = events.map((event: any) => {
    const eventStaff = staffByEvent[event.id] || { photographers: [], videographers: [] };
    
    // Combine staff assignments with primary assignments, removing duplicates
    const allPhotographers = [...new Set([
      ...(event.photographer?.full_name ? [event.photographer.full_name] : []),
      ...eventStaff.photographers
    ])];
    
    const allVideographers = [...new Set([
      ...(event.videographer?.full_name ? [event.videographer.full_name] : []),
      ...eventStaff.videographers
    ])];

    return [
      event.clients?.name || 'Unknown Client',                    // Client Name
      event.event_type,                                           // Event Type
      event.event_date,                                           // Event Date
      event.venue || '',                                          // Location / Venue
      event.storage_disk || '',                                   // Storage Disk
      event.storage_size || '',                                   // Storage Size
      allPhotographers.join(', ') || '',                         // Assigned Photographer(s)
      allVideographers.join(', ') || '',                         // Assigned Videographer(s)
      event.created_at.split('T')[0],                             // Booking Date
      event.advance_amount || 0,                                  // Advance Amount
      event.balance_amount || 0,                                  // Balance Amount
      event.total_amount || 0,                                    // Total Amount
      event.balance_amount > 0 ? 'Pending' : 'Paid',             // Payment Status
      event.photo_editing_status ? 'Yes' : 'No',                 // Photos Edited
      event.video_editing_status ? 'Yes' : 'No',                 // Videos Edited
      event.description || ''                                     // Remarks / Notes
    ];
  });

  // ONLY update Master Events sheet - NO individual event type sheets or backup
  await updateSheetData(accessToken, spreadsheetId, 'Master Events', allEventsData);
  console.log(`✅ Synced ${events.length} events to Master Events sheet only`);

  return { total: events.length, byType: 0 };
}

// Sync staff to Google Sheets - deduplicated by user_id
async function syncStaff(supabase: any, accessToken: string, spreadsheetId: string, firmId: string) {
  const { data: staff, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch staff: ${error.message}`);
  }

  // Deduplicate staff by user_id
  const uniqueStaff = staff.reduce((acc: any[], member: any) => {
    const exists = acc.some(existing => existing.user_id === member.user_id);
    if (!exists) {
      acc.push(member);
    }
    return acc;
  }, []);

  // Staff data WITH user_id for deduplication
  const staffData = uniqueStaff.map((member: any) => [
    member.id,                                  // Staff ID
    member.full_name,                          // Full Name
    member.role,                               // Role
    member.mobile_number,                      // Mobile Number
    member.created_at.split('T')[0],           // Join Date
    '',                                        // Remarks
    member.user_id                             // User ID (for deduplication)
  ]);

  await updateSheetData(accessToken, spreadsheetId, 'Staff', staffData);
  console.log(`✅ Synced ${uniqueStaff.length} unique staff members to Google Sheets (deduplicated from ${staff.length} total)`);
  return uniqueStaff.length;
}

// Sync tasks to Google Sheets (NO ID)
async function syncTasks(supabase: any, accessToken: string, spreadsheetId: string, firmId: string) {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assigned_profile:profiles!assigned_to(full_name),
      event:events(title, event_date, clients(name))
    `)
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }

  // Task data WITH ID
  const tasksData = tasks.map((task: any) => [
    task.id,
    task.title,
    task.assigned_profile?.full_name || 'Unassigned',
    task.event?.clients?.name || '',
    task.event?.title || '',
    task.event?.event_date || '',
    task.task_type || 'Other',
    task.description || '',
    task.due_date || '',
    task.status,
    task.priority || 'Medium',
    task.updated_at.split('T')[0],
    ''
  ]);

  await updateSheetData(accessToken, spreadsheetId, 'Tasks', tasksData);
  console.log(`✅ Synced ${tasks.length} tasks to Google Sheets`);
  return tasks.length;
}

// Sync expenses to Google Sheets (NO ID)
async function syncExpenses(supabase: any, accessToken: string, spreadsheetId: string, firmId: string) {
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select(`
      *,
      event:events(title)
    `)
    .eq('firm_id', firmId)
    .order('expense_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch expenses: ${error.message}`);
  }

  // Expense data WITHOUT ID
  const expensesData = expenses.map((expense: any) => [
    expense.expense_date,
    expense.category,
    '', // Paid To / Vendor - not in current schema
    expense.description,
    expense.amount,
    '', // Payment Mode - not in current schema
    expense.event?.title || '',
    expense.receipt_url ? 'Yes' : 'No',
    ''
  ]);

  await updateSheetData(accessToken, spreadsheetId, 'Expenses', expensesData);
  console.log(`✅ Synced ${expenses.length} expenses to Google Sheets`);
  return expenses.length;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    console.log('🚀 Starting comprehensive data sync to Google Sheets...');
    const { firmId, syncType = 'all' } = await req.json();
    
    if (!firmId) {
      console.error('❌ Firm ID is required');
      return new Response(JSON.stringify({
        success: false,
        error: 'Firm ID is required'
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

    if (firmError || !firm) {
      console.error('❌ Firm not found:', firmError?.message);
      return new Response(JSON.stringify({
        success: false,
        error: 'Firm not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!firm.spreadsheet_id) {
      console.error('❌ No spreadsheet ID found for firm');
      return new Response(JSON.stringify({
        success: false,
        error: 'No Google Spreadsheet configured for this firm'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Firm found:', firm.name);
    console.log('📊 Spreadsheet ID:', firm.spreadsheet_id);

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

    const syncResults = {
      clients: 0,
      events: { total: 0, byType: 0 },
      staff: 0,
      tasks: 0,
      expenses: 0
    };

    // Sync data based on syncType
    if (syncType === 'all' || syncType === 'clients') {
      try {
        syncResults.clients = await syncClients(supabase, accessToken, firm.spreadsheet_id, firmId);
      } catch (error) {
        console.error('❌ Failed to sync clients:', error.message);
      }
    }

    if (syncType === 'all' || syncType === 'events') {
      try {
        syncResults.events = await syncEvents(supabase, accessToken, firm.spreadsheet_id, firmId);
      } catch (error) {
        console.error('❌ Failed to sync events:', error.message);
      }
    }

    if (syncType === 'all' || syncType === 'staff') {
      try {
        syncResults.staff = await syncStaff(supabase, accessToken, firm.spreadsheet_id, firmId);
      } catch (error) {
        console.error('❌ Failed to sync staff:', error.message);
      }
    }

    if (syncType === 'all' || syncType === 'tasks') {
      try {
        syncResults.tasks = await syncTasks(supabase, accessToken, firm.spreadsheet_id, firmId);
      } catch (error) {
        console.error('❌ Failed to sync tasks:', error.message);
      }
    }

    if (syncType === 'all' || syncType === 'expenses') {
      try {
        syncResults.expenses = await syncExpenses(supabase, accessToken, firm.spreadsheet_id, firmId);
      } catch (error) {
        console.error('❌ Failed to sync expenses:', error.message);
      }
    }

    console.log('🎉 Comprehensive sync completed!');

    return new Response(JSON.stringify({
      success: true,
      message: 'Data synced successfully to Google Sheets with proper headers and Lexend font',
      firm: {
        id: firm.id,
        name: firm.name,
        spreadsheetId: firm.spreadsheet_id
      },
      syncResults,
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
