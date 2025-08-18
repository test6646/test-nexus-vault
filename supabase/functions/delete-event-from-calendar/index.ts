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
    scope: 'https://www.googleapis.com/auth/calendar',
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

// Delete calendar event
async function deleteEventFromCalendar(accessToken: string, calendarId: string, calendarEventId: string) {
  const deleteResponse = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${calendarEventId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!deleteResponse.ok) {
    // If event doesn't exist (404), that's also considered success
    if (deleteResponse.status === 404) {
      console.log(`📅 Calendar event ${calendarEventId} not found (already deleted or never existed)`);
      return { deleted: false, reason: 'not_found' };
    }
    
    const errorText = await deleteResponse.text();
    throw new Error(`Failed to delete calendar event: ${errorText}`);
  }

  console.log(`✅ Successfully deleted calendar event: ${calendarEventId}`);
  return { deleted: true };
}

serve(async (req) => {
  console.log('🗑️ DELETE-EVENT-FROM-CALENDAR FUNCTION CALLED');
  console.log('📨 Request method:', req.method);
  
  if (req.method === 'OPTIONS') {
    console.log('📨 Handling CORS preflight request');
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    console.log('📅 Starting event deletion from Google Calendar...');
    const { eventId, calendarEventId } = await req.json();
    
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
      .select('id, firm_id, title, event_type, calendar_event_id')
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

    // Use provided calendarEventId or get from event record
    const targetCalendarEventId = calendarEventId || event.calendar_event_id;
    
    if (!targetCalendarEventId) {
      console.log('⚠️ No calendar event ID found, skipping calendar deletion');
      return new Response(JSON.stringify({
        success: true,
        message: 'No calendar event to delete (event was not synced to calendar)',
        deleted: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get firm details
    const { data: firm, error: firmError } = await supabase
      .from('firms')
      .select('*')
      .eq('id', event.firm_id)
      .single();

    if (firmError || !firm || !firm.calendar_id) {
      console.error('❌ Firm not found or no calendar configured');
      return new Response(JSON.stringify({
        success: false,
        error: 'Firm not found or no Google Calendar configured'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Event found:', event.title || event.event_type);
    console.log('📅 Calendar ID:', firm.calendar_id);
    console.log('🗑️ Calendar Event ID to delete:', targetCalendarEventId);

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

    // Delete event from calendar
    const deleteResult = await deleteEventFromCalendar(accessToken, firm.calendar_id, targetCalendarEventId);
    
    // Clear the calendar_event_id from the database record
    if (deleteResult.deleted) {
      await supabase
        .from('events')
        .update({ calendar_event_id: null })
        .eq('id', eventId);
      
      console.log('✅ Cleared calendar_event_id from database');
    }

    return new Response(JSON.stringify({
      success: true,
      message: deleteResult.deleted 
        ? `Event "${event.title || event.event_type}" deleted from Google Calendar`
        : `Calendar event not found (may have been already deleted)`,
      deleted: deleteResult.deleted,
      reason: deleteResult.reason || null
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