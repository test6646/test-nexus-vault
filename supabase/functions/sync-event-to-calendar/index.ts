
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

// Create or update calendar event
async function syncEventToCalendar(supabase: any, accessToken: string, calendarId: string, eventId: string) {
  // Get event with staff assignments
  const { data: event, error } = await supabase
    .from('events')
    .select(`
      *,
      clients(name, phone, email)
    `)
    .eq('id', eventId)
    .single();

  if (error || !event) {
    throw new Error(`Event not found: ${error?.message}`);
  }

  // Get staff assignments for all days (including freelancers)
  const { data: staffAssignments } = await supabase
    .from('event_staff_assignments')
    .select(`
      *,
      staff:profiles!staff_id(full_name),
      freelancer:freelancers!freelancer_id(full_name)
    `)
    .eq('event_id', eventId)
    .order('day_number');

  // Group staff by role and day
  const photographers = [];
  const cinematographers = [];
  
  if (staffAssignments) {
    staffAssignments.forEach(assignment => {
      // Get name from either staff or freelancer
      const assigneeName = assignment.staff?.full_name || assignment.freelancer?.full_name || 'Unassigned';
      
      if (assignment.role === 'Photographer') {
        photographers.push(`Day ${assignment.day_number}: ${assigneeName}`);
      } else if (assignment.role === 'Cinematographer') {
        cinematographers.push(`Day ${assignment.day_number}: ${assigneeName}`);
      }
    });
  }

  // Prepare calendar event data
  const startDate = new Date(event.event_date);
  let endDate;
  
  // Handle multi-day events properly
  if (event.total_days && event.total_days > 1) {
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (event.total_days - 1));
  } else {
    endDate = new Date(startDate);
  }
  
  // Create all-day event (no specific time)
  const isAllDay = !event.event_time || event.event_time === '';
  
  let eventData;
  if (isAllDay) {
    // All-day event
    eventData = {
      start: {
        date: startDate.toISOString().split('T')[0], // YYYY-MM-DD format
        timeZone: 'Asia/Kolkata'
      },
      end: {
        date: new Date(endDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Next day for all-day
        timeZone: 'Asia/Kolkata'
      }
    };
  } else {
    // Timed event
    eventData = {
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'Asia/Kolkata'
      },
      end: {
        dateTime: new Date(startDate.getTime() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours duration
        timeZone: 'Asia/Kolkata'
      }
    };
  }

  // Get event type specific color
  const getEventColor = (eventType: string): string => {
    const colorMap: Record<string, string> = {
      'Ring-Ceremony': '3',    // Grape        (#dbadff)
      'Pre-Wedding': '9',      // Blueberry    (#5484ed)
      'Wedding': '11',         // Tomato       (#dc2127)
      'Maternity Photography': '5',  // Banana       (#fbd75b)
      'Others': '8'            // Graphite     (#e1e1e1)
    };
    return colorMap[eventType] || '8'; // Default to Graphite for unknown types
  };

  const calendarEvent = {
    summary: `${event.clients?.name || 'Unknown Client'} - ${event.event_type}`,
    description: `
Client: ${event.clients?.name || 'Unknown'}
Phone: ${event.clients?.phone || 'Not provided'}
Event Type: ${event.event_type}
Venue: ${event.venue || 'Not specified'}
${photographers.length > 0 ? `Photographers: ${photographers.join(', ')}` : 'Photographers: Not assigned'}
${cinematographers.length > 0 ? `Cinematographers: ${cinematographers.join(', ')}` : 'Cinematographers: Not assigned'}
${event.total_days && event.total_days > 1 ? `Duration: ${event.total_days} days` : ''}
    `.trim(),
    ...eventData,
    location: event.venue || '',
    colorId: getEventColor(event.event_type),
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 24 * 60 }, // 1 day before
        { method: 'popup', minutes: 60 }       // 1 hour before
      ]
    }
  };

  let calendarEventId = event.calendar_event_id;
  let operation = 'created';

  try {
    if (calendarEventId) {
      // Update existing event
      const updateResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${calendarEventId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(calendarEvent)
        }
      );

      if (!updateResponse.ok) {
        // If update fails, try to create new event
        throw new Error('Update failed, will create new event');
      }

      operation = 'updated';
      console.log(`✅ Updated calendar event: ${calendarEventId}`);
    } else {
      // Create new event
      throw new Error('No calendar event ID, creating new event');
    }
  } catch (error) {
    // Create new event
    const createResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(calendarEvent)
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create calendar event: ${errorText}`);
    }

    const createdEvent = await createResponse.json();
    calendarEventId = createdEvent.id;
    operation = 'created';

    // Update the event with the calendar event ID
    await supabase
      .from('events')
      .update({ calendar_event_id: calendarEventId })
      .eq('id', eventId);

    console.log(`✅ Created calendar event: ${calendarEventId}`);
  }

  return {
    event,
    calendarEventId,
    operation,
    calendarLink: `https://calendar.google.com/calendar/u/0/r/eventedit/${calendarEventId}`
  };
}

serve(async (req) => {
  console.log('🚀 SYNC-EVENT-TO-CALENDAR FUNCTION CALLED');
  console.log('📨 Request method:', req.method);
  
  if (req.method === 'OPTIONS') {
    console.log('📨 Handling CORS preflight request');
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    console.log('📅 Starting event sync to Google Calendar...');
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
      .select('id, firm_id, title, event_type')
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

    // Sync event to calendar
    const syncResult = await syncEventToCalendar(supabase, accessToken, firm.calendar_id, eventId);

    return new Response(JSON.stringify({
      success: true,
      message: `Event "${syncResult.event.title || syncResult.event.event_type}" ${syncResult.operation} in Google Calendar`,
      calendarEventId: syncResult.calendarEventId,
      calendarLink: syncResult.calendarLink
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
