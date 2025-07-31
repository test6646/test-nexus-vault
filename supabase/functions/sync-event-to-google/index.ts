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

// Helper function to update or append data to sheet with font formatting
async function updateOrAppendToSheet(accessToken: string, spreadsheetId: string, sheetName: string, newData: any[], clientNameIndex: number = 0) {
  // Get existing data
  const existingData = await getSheetValues(accessToken, spreadsheetId, sheetName);
  
  // Find if record exists (skip header row) - use client name for matching
  let rowIndex = -1;
  const clientName = newData[clientNameIndex];
  
  for (let i = 1; i < existingData.length; i++) {
    if (existingData[i] && existingData[i][clientNameIndex] === clientName) {
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
        })
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update sheet ${sheetName}: ${error}`);
    }
    
    console.log(`✅ Updated existing record in ${sheetName} at row ${rowIndex} with Lexend font`);
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
        })
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to append to sheet ${sheetName}: ${error}`);
    }
    
    console.log(`✅ Added new record to ${sheetName} at row ${nextRow} with Lexend font`);
    return await response.json();
  }
}

import { SHEET_HEADERS } from '../shared/sheet-headers.ts';

// Helper function to update or append data to sheet by event ID (PREVENTS OVERWRITES)
async function updateOrAppendToSheetByEventId(accessToken: string, spreadsheetId: string, sheetName: string, newData: any[], eventId: string) {
  // Get existing data
  const existingData = await getSheetValues(accessToken, spreadsheetId, sheetName);
  
  // Look for existing event by checking hidden event ID column
  let rowIndex = -1;
  
  // Search for existing record with matching event ID in hidden column
  for (let i = 1; i < existingData.length; i++) {
    if (existingData[i] && existingData[i].length > newData.length) {
      // Check if hidden event ID matches
      const hiddenEventId = existingData[i][existingData[i].length - 1];
      if (hiddenEventId === eventId) {
        rowIndex = i + 1; // Google Sheets is 1-indexed
        break;
      }
    }
  }
  
  // Add hidden column for event ID tracking (append to end of data)
  const fullEventData = [...newData, eventId];
  
  // Get sheet ID for batch update
  const sheetId = await getSheetId(accessToken, spreadsheetId, sheetName);
  
  // Prepare formatted data with Lexend font (including hidden event ID)
  const formattedRow = [{
    values: fullEventData.map((cell, index) => ({
      userEnteredValue: { stringValue: String(cell || '') },
      userEnteredFormat: {
        textFormat: {
          fontFamily: 'Lexend',
          fontSize: 10,
          // Hide the last column (event ID) by making text color nearly invisible
          ...(index === fullEventData.length - 1 ? {
            foregroundColor: { red: 1, green: 1, blue: 1, alpha: 0.01 }
          } : {})
        }
      }
    }))
  }];
  
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
                endRowIndex: rowIndex,
                endColumnIndex: fullEventData.length
              },
              rows: formattedRow,
              fields: 'userEnteredValue,userEnteredFormat.textFormat'
            }
          }]
        })
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update sheet ${sheetName}: ${error}`);
    }
    
    console.log(`✅ Updated existing event in ${sheetName} at row ${rowIndex} with Lexend font`);
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
                endRowIndex: nextRow,
                endColumnIndex: fullEventData.length
              },
              rows: formattedRow,
              fields: 'userEnteredValue,userEnteredFormat.textFormat'
            }
          }]
        })
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to append to sheet ${sheetName}: ${error}`);
    }
    
    console.log(`✅ Added new event to ${sheetName} at row ${nextRow} with Lexend font`);
    return await response.json();
  }
}

// ENHANCED Event sync - with multi-day support and staff assignments
async function syncEventToSheet(supabase: any, accessToken: string, spreadsheetId: string, eventId: string) {
  const { data: event, error } = await supabase
    .from('events')
    .select(`
      *,
      clients(id, name),
      photographer:profiles!photographer_id(full_name),
      videographer:profiles!videographer_id(full_name),
      editor:profiles!editor_id(full_name),
      same_day_editor:profiles!same_day_editor_id(full_name)
    `)
    .eq('id', eventId)
    .single();

  console.log(`✅ Event found: ${event?.title || event?.clients?.name || 'Unknown'}`);
  console.log(`📸 Event photographer: ${event?.photographer?.full_name || 'None'}`);
  console.log(`🎥 Event videographer: ${event?.videographer?.full_name || 'None'}`);

  if (error || !event) {
    throw new Error(`Event not found: ${error?.message}`);
  }

  // Get staff assignments with a separate query to ensure it works
  const { data: staffAssignments, error: staffError } = await supabase
    .from('event_staff_assignments')
    .select('*')
    .eq('event_id', eventId);

  console.log(`📋 Found ${staffAssignments?.length || 0} staff assignments for event`);

  // Get profile names for staff assignments separately  
  let staffWithProfiles = [];
  if (staffAssignments && staffAssignments.length > 0) {
    const staffIds = staffAssignments.map(assignment => assignment.staff_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', staffIds);
    
    // Combine staff assignments with profile names
    staffWithProfiles = staffAssignments.map(assignment => ({
      ...assignment,
      profile_name: profiles?.find(p => p.id === assignment.staff_id)?.full_name || 'Unknown'
    }));
  }

  // Group staff by role and day with ENHANCED multi-staff support for comma separation
  const photographersByDay: { [key: number]: string[] } = {};
  const videographersByDay: { [key: number]: string[] } = {};

  console.log(`📋 Processing ${staffAssignments?.length || 0} staff assignments:`);
  console.log('Staff assignments data:', JSON.stringify(staffAssignments, null, 2));

  if (staffWithProfiles && staffWithProfiles.length > 0) {
    staffWithProfiles.forEach((assignment, index) => {
      const day = assignment.day_number || 1;
      const staffName = assignment.profile_name || '';
      
      console.log(`👤 Assignment ${index + 1} - Day ${day}: ${assignment.role} -> ${staffName} (Staff ID: ${assignment.staff_id})`);
      
      if (assignment.role === 'Photographer' && staffName) {
        if (!photographersByDay[day]) photographersByDay[day] = [];
        // Prevent duplicates - only add if not already in the array
        if (!photographersByDay[day].includes(staffName)) {
          photographersByDay[day].push(staffName);
          console.log(`  ✅ Added photographer: ${staffName} to day ${day}`);
        } else {
          console.log(`  ⚠️ Duplicate photographer skipped: ${staffName} for day ${day}`);
        }
      } else if (assignment.role === 'Videographer' && staffName) {
        if (!videographersByDay[day]) videographersByDay[day] = [];
        // Prevent duplicates - only add if not already in the array
        if (!videographersByDay[day].includes(staffName)) {
          videographersByDay[day].push(staffName);
          console.log(`  ✅ Added videographer: ${staffName} to day ${day}`);
        } else {
          console.log(`  ⚠️ Duplicate videographer skipped: ${staffName} for day ${day}`);
        }
      } else if (!staffName) {
        console.log(`  ❌ Empty staff name for assignment: ${assignment.role} (Staff ID: ${assignment.staff_id})`);
      }
    });
  }

  console.log('📊 Final grouped staff by day:');
  console.log('Photographers by day:', JSON.stringify(photographersByDay, null, 2));
  console.log('Videographers by day:', JSON.stringify(videographersByDay, null, 2));

  // Calculate total days (use total_days from event or calculate from dates)
  const totalDays = event.total_days || 1;
  const eventDate = new Date(event.event_date);
  
  const syncedSheets = [];

  // Create entries for each day
  for (let day = 1; day <= totalDays; day++) {
    // Calculate the date for this day
    const currentDate = new Date(eventDate);
    currentDate.setDate(eventDate.getDate() + (day - 1));
    const dayDateString = currentDate.toISOString().split('T')[0];
    
    // Get photographers and videographers for this specific day
    const dayPhotographers = photographersByDay[day] || [];
    const dayVideographers = videographersByDay[day] || [];
    
    // Fallback to main photographer/videographer if no day-specific assignments
    if (dayPhotographers.length === 0 && event.photographer?.full_name) {
      dayPhotographers.push(event.photographer.full_name);
      console.log(`📸 Using main photographer for day ${day}: ${event.photographer.full_name}`);
    }
    if (dayVideographers.length === 0 && event.videographer?.full_name) {
      dayVideographers.push(event.videographer.full_name);
      console.log(`🎥 Using main videographer for day ${day}: ${event.videographer.full_name}`);
    }
    
    // ENHANCED logging for debugging with comma separation
    const photographersText = dayPhotographers.join(', ');
    const videographersText = dayVideographers.join(', ');
    
    console.log(`📅 Day ${day} - Photographers: ${photographersText || 'None'}`);
    console.log(`📅 Day ${day} - Videographers: ${videographersText || 'None'}`);

    // Create day-specific event title
    const dayTitle = totalDays > 1 
      ? `${event.clients?.name || 'Unknown Client'} - DAY ${day.toString().padStart(2, '0')}`
      : event.clients?.name || 'Unknown Client';

    // Create unique event key for this day
    const eventKey = totalDays > 1 ? `${event.id}-day${day}` : event.id;
    
    // Event data following EXACT CENTRALIZED headers with COMMA-SEPARATED staff
    // ✅ FIXED: Calculate proper payment status based on amounts
    const getPaymentStatus = (totalAmount: number, advanceAmount: number, balanceAmount: number) => {
      // PAID: Total amount exists and balance is 0 or negative
      if (totalAmount > 0 && balanceAmount <= 0) return 'Paid';
      // PARTIAL: Some payment made but balance still exists
      if (advanceAmount > 0 && balanceAmount > 0) return 'Partial';
      // PENDING: No payment made
      return 'Pending';
    };

    const paymentStatus = getPaymentStatus(
      event.total_amount || 0,
      event.advance_amount || 0, 
      event.balance_amount || 0
    );

    // ✅ FIXED: ALL DAYS MUST HAVE ALL THREE AMOUNTS (total, advance, balance)
    const eventData = [
      event.clients?.id || '',                           // Client ID
      dayTitle,                                          // Client Name (with day suffix for multi-day)
      event.event_type,                                  // Event Type
      dayDateString,                                     // Event Date (adjusted for day)
      event.venue || '',                                 // Location / Venue
      event.storage_disk || '',                          // Storage Disk
      event.storage_size ? event.storage_size.toString() : '', // Storage Size
      photographersText,                                 // Assigned Photographer(s) - COMMA SEPARATED
      videographersText,                                 // Assigned Videographer(s) - COMMA SEPARATED
      event.created_at.split('T')[0],                    // Booking Date
      event.advance_amount || 0,                         // ✅ FIXED: Advance Amount (ALL DAYS)
      event.balance_amount || 0,                         // ✅ FIXED: Balance Amount (ALL DAYS)
      event.total_amount || 0,                          // ✅ FIXED: Total Amount (ALL DAYS)
      paymentStatus,                                     // ✅ FIXED: Proper Payment Status calculation
      event.photo_editing_status ? 'Yes' : 'No',        // Photos Edited
      event.video_editing_status ? 'Yes' : 'No',        // Videos Edited
      `Day ${day}/${totalDays}${event.description ? ` - ${event.description}` : ''}` // Remarks / Notes
    ];

    // Sync to Master Events sheet using EVENT ID + day as unique key
    await updateOrAppendToSheetByEventId(accessToken, spreadsheetId, 'Master Events', eventData, eventKey);
    console.log(`✅ Synced event ${dayTitle} to Master Events sheet with staff: P[${photographersText}] V[${videographersText}]`);
    syncedSheets.push('Master Events');

    // Also sync to event-specific type sheet using exact event type as sheet name
    try {
      const sheetName = event.event_type; // Use event type directly as sheet name
      console.log(`🎯 Event type "${event.event_type}" → Sheet name "${sheetName}"`);
      await updateOrAppendToSheetByEventId(accessToken, spreadsheetId, sheetName, eventData, eventKey);
      console.log(`✅ Also synced event to ${sheetName} sheet with staff: P[${photographersText}] V[${videographersText}]`);
      if (!syncedSheets.includes(sheetName)) {
        syncedSheets.push(sheetName);
      }
    } catch (eventTypeError) {
      console.warn(`⚠️ Could not sync to event-specific sheet "${event.event_type}": ${eventTypeError.message}`);
    }
  }

  return {
    event,
    syncedSheets,
    totalDays
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    console.log('🚀 Starting event sync to Google Sheets...');
    const { eventId } = await req.json();
    
    if (!eventId) {
      console.error('❌ Event ID is required');
      return new Response(JSON.stringify({
        success: false,
        error: 'Event ID is required'
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

    // Get event and firm details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, firm_id, title')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('❌ Event not found:', eventError?.message);
      return new Response(JSON.stringify({
        success: false,
        error: 'Event not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get firm details
    const { data: firm, error: firmError } = await supabase
      .from('firms')
      .select('*')
      .eq('id', event.firm_id)
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

    console.log('✅ Event found:', event.title);
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

    // Sync event to sheets
    const syncResult = await syncEventToSheet(supabase, accessToken, firm.spreadsheet_id, eventId);

    return new Response(JSON.stringify({
      success: true,
      message: `Event "${syncResult.event.clients?.name || 'Unknown'}" synced to Google Sheets`,
      syncedSheets: syncResult.syncedSheets,
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
