import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, CheckCircle, MessageCircle, Link, RefreshCw, Zap, Settings, BrushIcon, FileText } from 'lucide-react';
import { QrCode01Icon } from 'hugeicons-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { EmptyState } from '@/components/ui/empty-state';
import { PageSkeleton } from '@/components/ui/skeleton';
import WhatsAppBranding from '@/components/whatsapp/WhatsAppBranding';
import UnifiedNotificationTemplates from '@/components/whatsapp/UnifiedNotificationTemplates';

type ConnectionStage = 'initial' | 'qr-generated' | 'connected';

const WhatsAppIntegration = () => {
  const { profile, currentFirmId } = useAuth();
  const [stage, setStage] = useState<ConnectionStage>('initial');
  const [qrCode, setQrCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [backendUrl, setBackendUrl] = useState<string>('');
  const [initialLoading, setInitialLoading] = useState(true);
  const hasCheckedStatus = useRef<string | boolean>(false);
  const { toast } = useToast();

  // Reset state when firm changes - CRITICAL: Reset everything properly
  useEffect(() => {
    if (currentFirmId) {
      // Reset all state for new firm - CRITICAL: Reset ref to allow initialization
      hasCheckedStatus.current = false;
      setStage('initial');
      setQrCode('');
      setIsLoading(false);
      setIsSendingTest(false);
      setIsCheckingStatus(false);
      setInitialLoading(true);
    }
  }, [currentFirmId]);

  // Get backend URL and check initial status - FIRM-SPECIFIC
  useEffect(() => {
    const initializeWhatsApp = async () => {
      if (!currentFirmId) {
        setInitialLoading(false);
        return;
      }
      
      // CRITICAL: Don't use ref to prevent re-runs - each firm needs fresh check
      setInitialLoading(true);
      
      try {
        // Get backend URL with timeout and error handling
        let backendUrlData;
        try {
          const { data } = await supabase.functions.invoke('get-backend-url');
          backendUrlData = data;
        } catch (backendError) {
          console.warn('Backend URL fetch failed, using fallback:', backendError);
          // Continue with empty backend URL - will show error in UI
          setBackendUrl('');
          setStage('initial');
          setInitialLoading(false);
          return;
        }
        
        if (!backendUrlData?.url) {
          console.warn('Backend URL not configured');
          setBackendUrl('');
          setStage('initial');
          setInitialLoading(false);
          return;
        }
        setBackendUrl(backendUrlData.url);
        
        // CRITICAL: First check database for existing session for THIS SPECIFIC FIRM
        const { data: sessionData, error: sessionError } = await supabase
          .from('wa_sessions')
          .select('status, session_data, updated_at')
          .eq('id', currentFirmId)
          .eq('firm_id', currentFirmId)
          .maybeSingle();

        console.log('Session data from database:', sessionData);

        // If NO session exists in database for this firm, show as disconnected
        if (!sessionData || sessionError) {
          console.log('No session found in database or error:', sessionError);
          setStage('initial');
          setInitialLoading(false);
          return;
        }

        // Check database status directly - FIXED: Use status column not session_data
        console.log('Database status:', sessionData.status);
        if (sessionData.status === 'connected') {
          console.log('Database shows connected status, setting stage to connected');
          // Session shows connected in database - trust database status
          setStage('connected');
        } else {
          console.log('Database status not connected, checking backend...');
          // Session exists but doesn't show connected status, check backend fresh
          try {
            const response = await fetch(`${backendUrlData.url}/api/whatsapp/status?firmId=${currentFirmId}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(5000) // 5s timeout
            });
            
            if (response.ok) {
              const statusData = await response.json();
              if (statusData.isConnected && statusData.firmId === currentFirmId) {
                setStage('connected');
              } else if (statusData.hasQR && statusData.firmId === currentFirmId) {
                setStage('qr-generated');
              } else {
                setStage('initial');
              }
            } else {
              setStage('initial');
            }
          } catch (fetchError) {
            console.warn('Backend status check failed:', fetchError);
            setStage('initial');
          }
        }
      } catch (error) {
        console.error('WhatsApp initialization error:', error);
        toast({
          title: "Initialization Warning",
          description: "Some features may be limited. Please refresh if issues persist.",
          variant: "destructive",
        });
        setStage('initial');
      } finally {
        setInitialLoading(false);
      }
    };
    
    // Add a small delay to prevent rapid re-initialization
    const timeoutId = setTimeout(initializeWhatsApp, 100);
    return () => clearTimeout(timeoutId);
  }, [currentFirmId, toast]);

  // Real-time subscription for WhatsApp session status changes
  useEffect(() => {
    if (!currentFirmId) return;

    const channel = supabase
      .channel('wa-session-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wa_sessions',
          filter: `firm_id=eq.${currentFirmId}`
        },
        (payload) => {
          console.log('Real-time WhatsApp status update:', payload);
          const newStatus = payload.new?.status;
          if (newStatus === 'connected') {
            setStage('connected');
            toast({
              title: "WhatsApp Connected!",
              description: "Your WhatsApp account is now linked successfully",
            });
          } else if (newStatus === 'disconnected') {
            setStage('initial');
            toast({
              title: "WhatsApp Disconnected",
              description: "Your WhatsApp connection has been lost",
              variant: "destructive",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentFirmId, toast]);

  const generateQR = async () => {
    if (!currentFirmId) {
      toast({
        title: "Configuration Error",
        description: "Please select a firm first",
        variant: "destructive",
      });
      return;
    }
    
    if (!backendUrl) {
      toast({
        title: "Backend Configuration Error",
        description: "Backend service is not available. Please contact support.",
        variant: "destructive",
      });
      return;
    }
    
    if (initialLoading) {
      toast({
        title: "Please Wait",
        description: "WhatsApp is still initializing. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

setIsLoading(true);
try {
  console.log(`[WhatsApp] Generating QR code for firm: ${currentFirmId}`);

  // Trigger backend to start/restart initialization (returns immediately)
  const generateResponse = await fetch(`${backendUrl}/api/whatsapp/generate-qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firmId: currentFirmId }),
  });

  if (!generateResponse.ok) {
    const errorText = await generateResponse.text().catch(() => 'Unknown error');
    throw new Error(`Backend generate-qr failed: ${generateResponse.status} - ${errorText}`);
  }

  const generateData = await generateResponse.json();
  if (!generateData.success) {
    throw new Error(generateData.message || 'Failed to initiate QR generation');
  }

  // Poll for QR availability without a fixed overall timeout
  // The QR endpoint will return 404 until Baileys emits a QR; we poll every 1s
  while (true) {
    try {
      const qrResponse = await fetch(`${backendUrl}/api/whatsapp/qr?firmId=${currentFirmId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (qrResponse.ok) {
        const qrData = await qrResponse.json();
        if (qrData.success && qrData.qrCode && qrData.firmId === currentFirmId) {
          setQrCode(qrData.qrCode);
          setStage('qr-generated');
          toast({
            title: 'QR Code Generated',
            description: `Scan with your WhatsApp to connect for firm ${qrData.firmId}`,
          });
          break;
        }
      }
    } catch (pollErr) {
      // Non-fatal; just continue polling
      console.warn('[WhatsApp] QR poll failed, retrying...', pollErr);
    }

    // Small wait before the next poll (no overall manual timeout)
    await new Promise((r) => setTimeout(r, 1000));
  }
} catch (error: unknown) {
  console.error('QR generation error:', error);
  toast({
    title: 'Error',
    description: error instanceof Error ? error.message : 'Failed to generate QR code. Make sure your backend is running and accessible',
    variant: 'destructive',
  });
} finally {
  setIsLoading(false);
}
  };

  const checkConnection = async () => {
    if (!backendUrl || initialLoading || !currentFirmId) {
      toast({
        title: "Configuration Error",
        description: !currentFirmId ? "Please select a firm first" : "Backend URL not configured",
        variant: "destructive",
      });
      return;
    }

    setIsCheckingStatus(true);
    try {
      // Checking connection for firm
      const response = await fetch(`${backendUrl}/api/whatsapp/status?firmId=${currentFirmId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Connection status checked
        if (data.isConnected && data.firmId === currentFirmId) {
          // Immediately store the session data in Supabase
          try {
            // Get firm data to populate session info
            const { data: firmData } = await supabase
              .from('firms')
              .select('name, description, tagline, contact_phone, contact_email, header_left_content, footer_content')
              .eq('id', currentFirmId)
              .single();

            const { error: upsertError } = await supabase
              .from('wa_sessions')
              .upsert({
                id: currentFirmId,
                firm_id: currentFirmId,
                session_data: data.sessionData || { connected: true, timestamp: new Date().toISOString() },
                status: 'connected',
                reconnect_enabled: false,
                firm_name: firmData?.name || 'Unknown Firm',
                firm_tagline: firmData?.tagline || firmData?.description || '',
                contact_info: firmData?.contact_phone && firmData?.contact_email 
                  ? `Contact: ${firmData.contact_phone}\nEmail: ${firmData.contact_email}`
                  : firmData?.header_left_content || '',
                footer_signature: firmData?.footer_content || ''
              });
            
            if (upsertError) {
              console.error('Error storing session data:', upsertError);
            } else {
              console.log('Session data stored successfully for firm:', currentFirmId);
            }
          } catch (dbError) {
            console.error('Database error occurred:', dbError);
          }

          setStage('connected');
          toast({
            title: "WhatsApp Connected!",
            description: `Your WhatsApp account is now linked successfully for firm ${data.firmId}`,
          });
        } else {
          toast({
            title: "Not Connected Yet",
            description: `Please scan the QR code with your WhatsApp for firm ${currentFirmId}`,
            variant: "destructive",
          });
        }
      } else {
        throw new Error('Failed to check connection status');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check connection status",
        variant: "destructive",
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const sendTestMessage = async () => {
    if (!backendUrl || initialLoading || !currentFirmId) {
      toast({
        title: "Configuration Error",
        description: !currentFirmId ? "Please select a firm first" : "Backend URL not configured",
        variant: "destructive",
      });
      return;
    }

    setIsSendingTest(true);
    try {
      // Sending test message
      const response = await fetch(`${backendUrl}/api/whatsapp/send-test-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firmId: currentFirmId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast({
            title: "Test Message Sent!",
            description: data.message,
          });
        } else {
          throw new Error(data.message || 'Failed to send test message');
        }
      } else {
        throw new Error('Failed to send test message');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send test message",
        variant: "destructive",
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Initializing WhatsApp...</p>
        </div>
      </div>
    );
  }

  if (!currentFirmId) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="No Firm Selected"
        description="Please select a firm to configure WhatsApp integration."
      />
    );
  }

  const isAnyLoading = initialLoading || isLoading || isCheckingStatus || isSendingTest;

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex justify-center mb-6">
        <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border ${
          stage === 'connected' 
            ? 'bg-primary/10 border-primary/20 text-primary' 
            : 'bg-muted/50 border-border'
        }`}>
          {stage === 'connected' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <Link className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {stage === 'connected' ? 'Connected' : 'Not Connected'}
          </span>
        </div>
      </div>

      <Tabs defaultValue="connection" className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
            <TabsTrigger 
              value="connection" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Link className="mr-2 h-4 w-4" />
              Connection
            </TabsTrigger>
            <TabsTrigger 
              value="branding" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <BrushIcon className="mr-2 h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger 
              value="templates" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <FileText className="mr-2 h-4 w-4" />
              Templates
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="connection" className="space-y-4">
          {/* Stage-wise Connection Flow */}
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Stage 1: Initial - Generate QR */}
            {stage === 'initial' && (
              <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto flex items-center justify-center mb-4">
                    <QrCode01Icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Connect WhatsApp</CardTitle>
                  <p className="text-muted-foreground">
                    Generate QR code to connect WhatsApp
                  </p>
                </CardHeader>
                <CardContent className="text-center space-y-4 pt-0">
                  <Button 
                    onClick={generateQR} 
                    disabled={isAnyLoading}
                    size="lg"
                    className="w-full"
                  >
                   {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting to WhatsApp...
                      </>
                    ) : (
                      <>
                        <QrCode01Icon className="mr-2 h-4 w-4" />
                        Generate QR Code
                      </>
                    )}
                 </Button>
               </CardContent>
              </Card>
            )}

            {/* Stage 2: QR Generated - Scan and Check */}
            {stage === 'qr-generated' && (
              <Card className="border-2 border-primary/20">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl">Scan QR Code</CardTitle>
                  <p className="text-muted-foreground">
                    Use WhatsApp app to scan the code
                  </p>
                </CardHeader>
                <CardContent className="space-y-6 pt-0">
                  <div className="text-center">
                    <div className="bg-white p-4 rounded-xl border-2 border-dashed border-border inline-block">
                      <img 
                        src={qrCode} 
                        alt="WhatsApp QR Code" 
                        className="w-48 h-48"
                      />
                    </div>
                    <div className="mt-4 space-y-1">
                      <p className="text-sm font-medium">How to scan:</p>
                      <p className="text-xs text-muted-foreground">
                        WhatsApp → Settings → Linked Devices → Link a Device
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={checkConnection} 
                    disabled={isAnyLoading}
                    size="lg"
                    className="w-full"
                  >
                   {isCheckingStatus ? (
                     <>
                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                       Checking Connection...
                     </>
                   ) : (
                     <>
                       <RefreshCw className="mr-2 h-4 w-4" />
                       I've Linked My WhatsApp
                     </>
                   )}
                 </Button>
               </CardContent>
              </Card>
            )}

            {/* Stage 3: Connected - Test and Features */}
            {stage === 'connected' && (
              <div className="space-y-6">
                <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto flex items-center justify-center mb-4">
                      <CheckCircle className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-primary text-xl">WhatsApp Connected!</CardTitle>
                    <p className="text-muted-foreground">
                      WhatsApp connected successfully
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <div className="text-center p-4 bg-muted/30 rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-1">Test number</p>
                      <p className="font-mono text-sm font-medium">+91 91064 03233</p>
                    </div>
                    
                    <Button 
                      onClick={sendTestMessage} 
                      disabled={isAnyLoading}
                      size="lg"
                      className="w-full"
                      variant="default"
                    >
                     {isSendingTest ? (
                       <>
                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                         Sending Test Message...
                       </>
                     ) : (
                       <>
                         <Send className="mr-2 h-4 w-4" />
                         Send Test Message
                       </>
                     )}
                   </Button>
                 </CardContent>
                </Card>

                {/* Auto-notifications Status */}
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center space-y-4">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-primary">
                          Auto-notifications enabled
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <Zap className="h-4 w-4 text-primary mx-auto mb-1" />
                          <p className="text-xs font-medium">Payments</p>
                          <p className="text-xs text-muted-foreground">Auto receipts</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <MessageCircle className="h-4 w-4 text-primary mx-auto mb-1" />
                          <p className="text-xs font-medium">Events</p>
                          <p className="text-xs text-muted-foreground">Updates</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-primary mx-auto mb-1" />
                          <p className="text-xs font-medium">Tasks</p>
                          <p className="text-xs text-muted-foreground">Reminders</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="branding" className="space-y-6">
          <WhatsAppBranding />
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <UnifiedNotificationTemplates />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsAppIntegration;
