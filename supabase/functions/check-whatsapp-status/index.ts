import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user's JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get user's firm ID from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('current_firm_id')
      .eq('user_id', (await supabase.auth.getUser(authHeader.replace('Bearer ', ''))).data.user?.id)
      .single();

    if (profileError || !profile?.current_firm_id) {
      throw new Error('User has no firm assigned');
    }

    const firmId = profile.current_firm_id;

    // Get or create WhatsApp session for this firm
    let { data: session, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('firm_id', firmId)
      .single();

    if (sessionError && sessionError.code !== 'PGRST116') {
      throw sessionError;
    }

    // Create session if it doesn't exist
    if (!session) {
      // Clean up any old sessions for this firm first
      await supabase
        .from('whatsapp_sessions')
        .delete()
        .eq('firm_id', firmId)
        .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const sessionId = `firm_${firmId}`;
      const { data: newSession, error: createError } = await supabase
        .from('whatsapp_sessions')
        .insert({
          firm_id: firmId,
          session_id: sessionId,
          status: 'disconnected'
        })
        .select()
        .single();

      if (createError) throw createError;
      session = newSession;
    }

    const RAILWAY_URL = Deno.env.get('RAILWAY_WHATSAPP_URL') || 'https://railway-whatsapp-service-production-e337.up.railway.app';
    
    let actualStatus = session.status || 'disconnected';
    let isReady = false;
    let qr_available = false;
    let queue_length = 0;
    let connected_at = session.connected_at;
    
    console.log(`🔍 Checking Railway status for session: ${session.session_id}`);
    
    // Check if session has been connecting for too long (more than 5 minutes)
    const sessionCreatedAt = new Date(session.created_at);
    const connectingTime = Date.now() - sessionCreatedAt.getTime();
    const maxConnectingTime = 5 * 60 * 1000; // 5 minutes
    
    // Try Railway service status check with proper timeout handling
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      console.log(`🔍 Checking Railway status for session: ${session.session_id} (${Math.round(connectingTime/1000)}s elapsed)`);
      const response = await fetch(`${RAILWAY_URL}/api/status/${session.session_id}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Supabase-Edge-Function'
        }
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const responseText = await response.text();
        console.log(`📊 Railway response: ${responseText}`);
        
        try {
          const status = JSON.parse(responseText);
          console.log(`✅ Railway status:`, status);
          
          // Handle different Railway responses more robustly
          if (status.status === 'authenticated' || status.ready === true || status.status === 'connected') {
            actualStatus = 'connected';
            isReady = true;
            connected_at = status.connected_at || connected_at || new Date().toISOString();
            console.log('🟢 Status: CONNECTED - WhatsApp authenticated');
          } else if (status.status === 'qr_ready' && status.qr_available === true) {
            actualStatus = 'qr_ready';
            qr_available = true;
            console.log('🟡 Status: QR_READY - Scan code to connect');
          } else if (status.status === 'connecting' || status.status === 'initializing') {
            // Check for timeout if stuck connecting
            if (connectingTime > maxConnectingTime) {
              console.log(`⏰ Connection timeout after ${Math.round(connectingTime/1000)}s - resetting session`);
              // Reset the session by calling disconnect first
              try {
                await fetch(`${RAILWAY_URL}/api/disconnect`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': session.session_id,
                  },
                  body: JSON.stringify({
                    sessionId: session.session_id,
                    firmId: firmId
                  }),
                });
                console.log('🔄 Forced disconnect sent to Railway');
              } catch (disconnectError) {
                console.error('❌ Failed to disconnect stuck session:', disconnectError);
              }
              actualStatus = 'disconnected';
            } else {
              actualStatus = 'connecting';
              console.log(`🟡 Status: CONNECTING - Railway service (${Math.round(connectingTime/1000)}s elapsed)`);
            }
          } else if (status.status === 'error' || status.error) {
            console.log('❌ Railway reports error:', status.error || status.status);
            actualStatus = 'disconnected';
          } else {
            actualStatus = 'disconnected';
            console.log('🔴 Status: DISCONNECTED - Railway service response:', status.status);
          }
          
          queue_length = status.queue_length || 0;
          
        } catch (parseError) {
          console.error('❌ Failed to parse Railway response:', parseError);
          // If not JSON, Railway service might be returning error message
          if (responseText.toLowerCase().includes('too many') || responseText.toLowerCase().includes('rate limit')) {
            console.log('⚠️ Railway rate limited, keeping existing status');
            // Keep existing status from database
          } else {
            actualStatus = 'disconnected';
          }
        }
      } else {
        console.error(`❌ Railway API error: ${response.status} ${response.statusText}`);
        // If Railway is down, keep existing status from database unless it's connecting (which should timeout)
        if (session.status === 'connecting') {
          // Check if session has been connecting for too long (more than 5 minutes)
          const lastPing = session.last_ping ? new Date(session.last_ping) : new Date(session.created_at);
          const timeDiff = Date.now() - lastPing.getTime();
          if (timeDiff > 5 * 60 * 1000) { // 5 minutes
            actualStatus = 'disconnected';
            console.log('⏰ Session timeout: changing from connecting to disconnected');
          }
        }
      }
    } catch (error) {
      console.error('❌ Railway service error:', error);
      // If Railway is unreachable and session has been connecting for too long, mark as disconnected
      if (session.status === 'connecting') {
        const lastPing = session.last_ping ? new Date(session.last_ping) : new Date(session.created_at);
        const timeDiff = Date.now() - lastPing.getTime();
        if (timeDiff > 5 * 60 * 1000) { // 5 minutes
          actualStatus = 'disconnected';
          console.log('⏰ Network timeout: changing from connecting to disconnected');
        }
      }
    }
    
    // Update session status in database
    const updateData = {
      status: actualStatus,
      last_ping: new Date().toISOString(),
      connected_at: connected_at
    };
    
    console.log('💾 Updating database with:', updateData);
    
    await supabase
      .from('whatsapp_sessions')
      .update(updateData)
      .eq('id', session.id);
    
    return new Response(JSON.stringify({
      status: actualStatus,
      ready: isReady,
      qr_available,
      queue_length,
      session_id: session.session_id,
      firm_id: firmId,
      connected_at: connected_at,
      last_ping: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error checking WhatsApp status:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      status: 'error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});