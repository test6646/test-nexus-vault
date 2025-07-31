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

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  try {
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    let firmId: string | null = null;
    let isAuthenticated = false;

    // Function to check WhatsApp status and send to client
    const checkAndSendStatus = async () => {
      if (!isAuthenticated || !firmId) {
        console.log('⚠️ Not authenticated, skipping status check');
        return;
      }
      
      try {
        const RAILWAY_URL = Deno.env.get('RAILWAY_WHATSAPP_URL') || 'https://railway-whatsapp-service-production-e337.up.railway.app';
        
        // Get session for this firm
        const { data: session } = await supabase
          .from('whatsapp_sessions')
          .select('*')
          .eq('firm_id', firmId)
          .single();

        if (!session) {
          socket.send(JSON.stringify({
            type: 'status_update',
            status: {
              status: 'no_session',
              ready: false,
              qr_available: false,
              queue_length: 0
            }
          }));
          return;
        }

        // Check status from Railway service
        const response = await fetch(`${RAILWAY_URL}/api/status/${session.session_id}`, {
          headers: {
            'X-Session-ID': session.session_id,
          }
        });

        if (response.ok) {
          const railwayStatus = await response.json();
          
          const statusData = {
            status: railwayStatus.status || 'unknown',
            ready: railwayStatus.ready || false,
            qr_available: railwayStatus.qr_available || false,
            queue_length: railwayStatus.queue_length || 0,
            session_id: session.session_id,
            connected_at: railwayStatus.connected_at,
            last_ping: new Date().toISOString()
          };

          // Update database with latest status
          await supabase
            .from('whatsapp_sessions')
            .update({
              status: statusData.status,
              qr_code: railwayStatus.qr_code || null,
              connected_at: railwayStatus.connected_at || session.connected_at,
              last_ping: statusData.last_ping
            })
            .eq('id', session.id);

          // Send to client
          socket.send(JSON.stringify({
            type: 'status_update',
            status: statusData
          }));

          console.log('📊 Status sent to client:', statusData.status, '- ready:', statusData.ready);
        } else {
          // Service unavailable
          socket.send(JSON.stringify({
            type: 'status_update',
            status: {
              status: 'service_unavailable',
              ready: false,
              qr_available: false,
              queue_length: 0
            }
          }));
        }
      } catch (error) {
        console.error('❌ Error checking status:', error);
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Failed to check WhatsApp status'
        }));
      }
    };

    // Set up periodic status checks
    let statusInterval: number;

    socket.onopen = () => {
      console.log('✅ WebSocket connection opened - waiting for authentication');
    };

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 Received message:', message.type);

        switch (message.type) {
          case 'auth':
            // Handle authentication
            try {
              const { data: { user }, error: userError } = await supabase.auth.getUser(message.token);
              
              if (userError || !user) {
                socket.send(JSON.stringify({
                  type: 'auth_error',
                  message: 'Invalid token'
                }));
                return;
              }

              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('current_firm_id, role')
                .eq('user_id', user.id)
                .single();

              if (profileError || !profile?.current_firm_id) {
                socket.send(JSON.stringify({
                  type: 'auth_error',
                  message: 'User has no firm assigned'
                }));
                return;
              }

              if (profile.role !== 'Admin') {
                socket.send(JSON.stringify({
                  type: 'auth_error',
                  message: 'Only administrators can access WhatsApp settings'
                }));
                return;
              }

              firmId = profile.current_firm_id;
              isAuthenticated = true;
              
              console.log('✅ User authenticated for firm:', firmId);
              socket.send(JSON.stringify({ type: 'auth_success' }));
              
              // Start status checking after authentication
              if (statusInterval) {
                clearInterval(statusInterval);
              }
              statusInterval = setInterval(checkAndSendStatus, 1000); // Start with 1-second polling
              await checkAndSendStatus();
              
            } catch (error) {
              console.error('❌ Authentication error:', error);
              socket.send(JSON.stringify({
                type: 'auth_error',
                message: 'Authentication failed'
              }));
            }
            break;
            
          case 'get_status':
            if (!isAuthenticated) {
              socket.send(JSON.stringify({
                type: 'error',
                message: 'Not authenticated'
              }));
              return;
            }
            await checkAndSendStatus();
            break;
            
          case 'ping':
            socket.send(JSON.stringify({ type: 'pong' }));
            break;
            
          case 'adjust_polling':
            if (!isAuthenticated) return;
            
            // Adjust polling frequency based on current state
            if (statusInterval) {
              clearInterval(statusInterval);
            }
            
            const interval = message.interval || 1000;
            console.log('🔄 Adjusting polling interval to:', interval + 'ms');
            statusInterval = setInterval(checkAndSendStatus, interval);
            break;
            
          case 'force_status_check':
            if (!isAuthenticated) return;
            
            // Force immediate status check - useful after QR scan
            console.log('🔍 Force checking status...');
            await checkAndSendStatus();
            
            // Temporarily increase polling frequency for 30 seconds to catch connection changes
            if (statusInterval) {
              clearInterval(statusInterval);
            }
            statusInterval = setInterval(checkAndSendStatus, 500); // Very frequent polling
            
            // Reset to normal polling after 30 seconds
            setTimeout(() => {
              if (statusInterval) {
                clearInterval(statusInterval);
                statusInterval = setInterval(checkAndSendStatus, 2000);
                console.log('🔄 Reset to normal polling interval');
              }
            }, 30000);
            break;
        }
      } catch (error) {
        console.error('❌ Error processing message:', error);
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message'
        }));
      }
    };

    socket.onclose = () => {
      console.log('🔌 WebSocket connection closed for firm:', firmId);
      if (statusInterval) {
        clearInterval(statusInterval);
      }
    };

    socket.onerror = (error) => {
      console.error('❌ WebSocket error for firm:', firmId, error);
      if (statusInterval) {
        clearInterval(statusInterval);
      }
    };

    return response;

  } catch (error) {
    console.error('❌ WebSocket setup error:', error);
    return new Response(`WebSocket setup failed: ${error.message}`, { 
      status: 500,
      headers: corsHeaders 
    });
  }
});