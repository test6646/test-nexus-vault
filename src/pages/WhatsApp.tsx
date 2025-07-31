import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Smartphone, Loader2, WifiOff, Check, RefreshCw, QrCode } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/AuthProvider';
import TopNavbar from '@/components/layout/TopNavbar';

interface WhatsAppStatus {
  status: string;
  ready: boolean;
  qr_available: boolean;
  queue_length: number;
}

const WhatsApp = () => {
  const { profile } = useAuth();
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

  // Check if user is admin
  if (profile?.role !== 'Admin') {
    return (
      <TopNavbar>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
                <p className="text-muted-foreground">Only administrators can access WhatsApp integration.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </TopNavbar>
    );
  }

  // Fetch WhatsApp status
  const fetchStatus = async () => {
    try {
      setStatusLoading(true);
      const { data, error } = await supabase.functions.invoke('whatsapp-status');
      if (error) throw error;
      setStatus(data);
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
      setStatus({ status: 'error', ready: false, qr_available: false, queue_length: 0 });
    } finally {
      setStatusLoading(false);
    }
  };

  // Fetch QR code
  const fetchQRCode = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('whatsapp-qr');
      if (error) throw error;
      
      if (data.success && data.qr_code) {
        setQrCode(data.qr_code);
        setStatus(prev => prev ? { ...prev, status: 'qr_ready', qr_available: true } : null);
        toast.success('QR code generated successfully');
      } else {
        toast.error(data.message || 'Failed to generate QR code');
      }
    } catch (error) {
      console.error('Error fetching QR code:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  // Reset connection
  const resetConnection = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('whatsapp-reset');
      if (error) throw error;
      
      setQrCode(null);
      setStatus(null);
      toast.success('WhatsApp connection reset. Generate new QR code.');
      await fetchStatus();
    } catch (error) {
      console.error('Error resetting connection:', error);
      toast.error('Failed to reset connection');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh status
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (!status) return 'bg-gray-500';
    switch (status.status) {
      case 'ready':
        return 'bg-green-500';
      case 'qr_ready':
        return 'bg-yellow-500';
      case 'authenticated':
        return 'bg-blue-500';
      default:
        return 'bg-red-500';
    }
  };

  const getStatusText = () => {
    if (!status) return 'Unknown';
    switch (status.status) {
      case 'ready':
        return 'Connected';
      case 'qr_ready':
        return 'QR Ready';
      case 'authenticated':
        return 'Authenticating';
      case 'disconnected':
        return 'Disconnected';
      default:
        return status.status;
    }
  };

  const getStatusIcon = () => {
    if (!status) return <WifiOff className="h-5 w-5" />;
    switch (status.status) {
      case 'ready':
        return <Check className="h-5 w-5" />;
      case 'qr_ready':
        return <Smartphone className="h-5 w-5" />;
      case 'authenticated':
        return <Loader2 className="h-5 w-5 animate-spin" />;
      default:
        return <WifiOff className="h-5 w-5" />;
    }
  };

  return (
    <TopNavbar>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-primary" />
              WhatsApp Integration
            </h1>
            <p className="text-muted-foreground mt-2">
              Connect WhatsApp to send notifications to your staff members
            </p>
          </div>
          <Button
            variant="outline"
            onClick={fetchStatus}
            disabled={statusLoading}
            className="gap-2"
          >
            {statusLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh Status
          </Button>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className={`h-4 w-4 rounded-full ${getStatusColor()}`} />
              Connection Status
            </CardTitle>
            <CardDescription>
              Current WhatsApp connection status and information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Status:</span>
              <Badge variant="secondary" className="flex items-center gap-2">
                {getStatusIcon()}
                {getStatusText()}
              </Badge>
            </div>

            {status?.queue_length > 0 && (
              <div className="flex items-center justify-between">
                <span className="font-medium">Message Queue:</span>
                <Badge variant="outline">
                  {status.queue_length} messages pending
                </Badge>
              </div>
            )}

            <div className="flex gap-2">
              {!status?.ready && (
                <Button 
                  onClick={fetchQRCode} 
                  disabled={loading}
                  className="gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <QrCode className="h-4 w-4" />
                  )}
                  Generate QR Code
                </Button>
              )}
              
              <Button 
                variant="outline" 
                onClick={resetConnection}
                disabled={loading}
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Reset Connection
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* QR Code Card */}
        {status?.status === 'qr_ready' && qrCode && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Scan QR Code
              </CardTitle>
              <CardDescription>
                Scan this QR code with WhatsApp to connect your account
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg border">
                  <img 
                    src={qrCode} 
                    alt="WhatsApp QR Code" 
                    className="w-64 h-64 object-contain"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-medium">How to connect:</p>
                <ol className="text-sm text-muted-foreground space-y-1 max-w-md mx-auto">
                  <li>1. Open WhatsApp on your phone</li>
                  <li>2. Tap Settings → Linked Devices</li>
                  <li>3. Tap "Link a Device"</li>
                  <li>4. Scan this QR code</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Connected Status Card */}
        {status?.status === 'ready' && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    WhatsApp Connected Successfully!
                  </h3>
                  <p className="text-green-600">
                    You can now send notifications to staff members when creating events and tasks.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>About WhatsApp Integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-medium">Features:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Send automatic notifications when new events are created</li>
                <li>• Notify staff members when tasks are assigned to them</li>
                <li>• Real-time status updates and connection monitoring</li>
                <li>• Secure connection using WhatsApp Web protocol</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Requirements:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• WhatsApp account with active phone number</li>
                <li>• Stable internet connection</li>
                <li>• Admin access to this system</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </TopNavbar>
  );
};

export default WhatsApp;