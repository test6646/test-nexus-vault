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

  // Reset state when firm changes
  useEffect(() => {
    if (currentFirmId) {
      hasCheckedStatus.current = false;
      setStage('initial');
      setQrCode('');
      setIsLoading(false);
      setIsSendingTest(false);
      setIsCheckingStatus(false);
      setInitialLoading(true);
    }
  }, [currentFirmId]);

  // Get backend URL and check initial status
  useEffect(() => {
    const initializeWhatsApp = async () => {
      if (!currentFirmId) {
        setInitialLoading(false);
        return;
      }
      
      setInitialLoading(true);
      
      try {
        // Get backend URL with timeout and error handling
        let backendUrlData;
        try {
          const { data } = await supabase.functions.invoke('get-backend-url');
          backendUrlData = data;
        } catch (backendError) {
          console.warn('Backend URL fetch failed, using fallback:', backendError);
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
        
        // Check database for existing session
        const { data: sessionData, error: sessionError } = await supabase
          .from('wa_sessions')
          .select('status, session_data, updated_at')
          .eq('id', currentFirmId)
          .eq('firm_id', currentFirmId)
          .maybeSingle();

        if (!sessionData || sessionError) {
          setStage('initial');
          setInitialLoading(false);
          return;
        }

        if (sessionData.status === 'connected') {
          setStage('connected');
        } else {
          try {
            const response = await fetch(`${backendUrlData.url}/api/whatsapp/status?firmId=${currentFirmId}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(5000)
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

      // Poll for QR availability
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
          console.warn('[WhatsApp] QR poll failed, retrying...', pollErr);
        }

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
      const response = await fetch(`${backendUrl}/api/whatsapp/status?firmId=${currentFirmId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.isConnected && data.firmId === currentFirmId) {
          try {
            // Get firm data to populate session info
            const { data: firmData } = await supabase
              .from('firms')
              .select('name, tagline, contact_phone, contact_email')
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
                firm_tagline: firmData?.tagline || '',
                contact_info: firmData?.contact_phone && firmData?.contact_email 
                  ? `Contact: ${firmData.contact_phone}\nEmail: ${firmData.contact_email}`
                  : '',
                footer_signature: firmData?.name || 'Studio'
              });
            
            if (upsertError) {
              console.error('Error storing session data:', upsertError);
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
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex justify-center">
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

      {/* Tab Navigation */}
      <Tabs defaultValue="connection" className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger 
              value="connection" 
              className="flex items-center gap-2 text-sm"
            >
              <Link className="h-4 w-4" />
              Connection
            </TabsTrigger>
            <TabsTrigger 
              value="branding" 
              className="flex items-center gap-2 text-sm"
            >
              <BrushIcon className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger 
              value="templates" 
              className="flex items-center gap-2 text-sm"
            >
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Connection Tab */}
        <TabsContent value="connection" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                WhatsApp Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {stage === 'initial' && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                    <MessageCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">Connect WhatsApp</h3>
                    <p className="text-sm text-muted-foreground">
                      Generate a QR code to link your WhatsApp account
                    </p>
                  </div>
                  <Button 
                    onClick={generateQR} 
                    disabled={isAnyLoading}
                    size="lg"
                    className="w-full max-w-xs"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating QR...
                      </>
                    ) : (
                      <>
                        <QrCode01Icon className="mr-2 h-4 w-4" />
                        Generate QR Code
                      </>
                    )}
                  </Button>
                </div>
              )}

              {stage === 'qr-generated' && qrCode && (
                <div className="text-center space-y-4">
                  <div className="bg-white p-4 rounded-lg border inline-block">
                    <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">Scan QR Code</h3>
                    <p className="text-sm text-muted-foreground">
                      Open WhatsApp on your phone and scan this code
                    </p>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button 
                      onClick={checkConnection} 
                      disabled={isAnyLoading}
                      variant="outline"
                    >
                      {isCheckingStatus ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Check Status
                        </>
                      )}
                    </Button>
                    <Button onClick={generateQR} disabled={isAnyLoading}>
                      <QrCode01Icon className="mr-2 h-4 w-4" />
                      New QR
                    </Button>
                  </div>
                </div>
              )}

              {stage === 'connected' && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-primary">Connected!</h3>
                    <p className="text-sm text-muted-foreground">
                      Your WhatsApp is successfully connected
                    </p>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button 
                      onClick={sendTestMessage} 
                      disabled={isAnyLoading}
                      variant="outline"
                    >
                      {isSendingTest ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send Test
                        </>
                      )}
                    </Button>
                    <Button onClick={generateQR} disabled={isAnyLoading}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reconnect
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <WhatsAppBranding />
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <UnifiedNotificationTemplates />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsAppIntegration;