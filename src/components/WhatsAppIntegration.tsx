import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, CheckCircle, MessageCircle, Link, RefreshCw, Zap } from 'lucide-react';
import { QrCode01Icon } from 'hugeicons-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { EmptyState } from '@/components/ui/empty-state';
import { PageSkeleton } from '@/components/ui/skeleton';

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
        // Get backend URL
        const { data } = await supabase.functions.invoke('get-backend-url');
        const url = data?.url || 'https://whatsapp-backend-n57s.onrender.com';
        setBackendUrl(url);
        
        // CRITICAL: First check database for existing session for THIS SPECIFIC FIRM
        const { data: sessionData, error: sessionError } = await supabase
          .from('wa_sessions')
          .select('*')
          .eq('id', currentFirmId)
          .eq('firm_id', currentFirmId)
          .maybeSingle();

        // If NO session exists in database for this firm, show as disconnected
        if (!sessionData || sessionError) {
          setStage('initial');
          setInitialLoading(false);
          return;
        }

        // If session exists in database, validate with backend using that session data
        const response = await fetch(`${url}/api/whatsapp/status?firmId=${currentFirmId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const statusData = await response.json();
          
          // Only show connected if both database has session AND backend confirms active
          if (statusData.isConnected && statusData.firmId === currentFirmId) {
            setStage('connected');
          } else {
            // Remove stale session from database
            await supabase
              .from('wa_sessions')
              .delete()
              .eq('firm_id', currentFirmId);
            setStage('initial');
          }
        } else {
          setStage('initial');
        }
      } catch (error) {
        setBackendUrl('https://whatsapp-backend-n57s.onrender.com');
        setStage('initial');
      } finally {
        setInitialLoading(false);
      }
    };
    
    initializeWhatsApp();
  }, [currentFirmId]);

  const generateQR = async () => {
    if (!backendUrl || initialLoading || !currentFirmId) {
      toast({
        title: "Configuration Error",
        description: !currentFirmId ? "Please select a firm first" : "Backend URL not configured",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // First, trigger QR generation with firmId
      const generateResponse = await fetch(`${backendUrl}/api/whatsapp/generate-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firmId: currentFirmId }),
      });
      
      if (!generateResponse.ok) {
        throw new Error('Failed to trigger QR generation');
      }

      // Wait a moment for QR to be generated
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Then fetch the actual QR code with firmId - CRITICAL: Ensure firm-specific QR
      const qrResponse = await fetch(`${backendUrl}/api/whatsapp/qr?firmId=${currentFirmId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (qrResponse.ok) {
        const qrData = await qrResponse.json();
        if (qrData.success && qrData.qrCode && qrData.firmId === currentFirmId) {
          setQrCode(qrData.qrCode);
          setStage('qr-generated');
          toast({
            title: "QR Code Generated",
            description: `Scan with your WhatsApp to connect for firm ${qrData.firmId}`,
          });
        } else {
          throw new Error(`QR code not ready yet for firm ${currentFirmId}. Please try again.`);
        }
      } else {
        throw new Error(`Failed to fetch QR code: ${qrResponse.status} ${qrResponse.statusText}`);
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate QR code. Make sure your backend is running and accessible",
        variant: "destructive",
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
            const { error: upsertError } = await supabase
              .from('wa_sessions')
              .upsert({
                id: currentFirmId,
                firm_id: currentFirmId,
                session_data: data.sessionData || { connected: true, timestamp: new Date().toISOString() }
              });
            
            if (upsertError) {
              // Error storing session data
            } else {
              // Session data stored successfully
            }
          } catch (dbError) {
            // Database error occurred
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
    return <PageSkeleton />;
  }

  if (!currentFirmId) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center space-x-3">
            <div className="p-3 bg-primary/10 rounded-full">
              <MessageCircle className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">
              WhatsApp Integration
            </h1>
          </div>
          <p className="text-muted-foreground">
            Connect WhatsApp for automatic client notifications
          </p>
        </div>
        
        <EmptyState
          icon={MessageCircle}
          title="No Firm Selected"
          description="Please select a firm to configure WhatsApp integration."
        />
      </div>
    );
  }

  const isAnyLoading = initialLoading || isLoading || isCheckingStatus || isSendingTest;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center space-x-3">
          <div className="p-3 bg-primary/10 rounded-full">
            <MessageCircle className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            WhatsApp Integration
          </h1>
        </div>
        <p className="text-muted-foreground">
          Connect WhatsApp for automatic client notifications
        </p>
      </div>
      
      {/* Status Badge */}
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

      {/* Stage-wise Connection Flow */}
      <div className="max-w-2xl mx-auto">
        {/* Stage 1: Initial - Generate QR */}
        {stage === 'initial' && (
          <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto flex items-center justify-center mb-4">
                <QrCode01Icon className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Connect WhatsApp</CardTitle>
              <p className="text-muted-foreground">
                Generate a QR code to link your WhatsApp account for automated client notifications
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
                   Generating QR Code...
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
                Use your WhatsApp app to scan the code below
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
                  Your WhatsApp account is now linked successfully
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <Zap className="h-5 w-5 text-primary mx-auto mb-1" />
                      <p className="text-xs font-medium">Payment Confirmations</p>
                      <p className="text-xs text-muted-foreground">Automatic receipts</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <MessageCircle className="h-5 w-5 text-primary mx-auto mb-1" />
                      <p className="text-xs font-medium">Event Updates</p>
                      <p className="text-xs text-muted-foreground">Status notifications</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-primary mx-auto mb-1" />
                      <p className="text-xs font-medium">Task Reminders</p>
                      <p className="text-xs text-muted-foreground">Assignment alerts</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppIntegration;