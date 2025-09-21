import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useDynamicBranding } from '@/hooks/useDynamicBranding';
import { Save, RotateCcw, BrushIcon } from 'lucide-react';

interface BrandingSettings {
  firm_name: string;
  firm_tagline: string;
  contact_info: string;
  footer_signature: string;
}

const WhatsAppBranding = () => {
  const { currentFirmId } = useAuth();
  const { toast } = useToast();
  const { firmName, tagline, getContactInfo, signature, loading: brandingLoading } = useDynamicBranding();
  
  const [settings, setSettings] = useState<BrandingSettings>({
    firm_name: firmName,
    firm_tagline: tagline,
    contact_info: getContactInfo(),
    footer_signature: signature
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadBrandingSettings();
  }, [currentFirmId]);

  useEffect(() => {
    if (!brandingLoading) {
      setSettings({
        firm_name: firmName,
        firm_tagline: tagline,
        contact_info: getContactInfo(),
        footer_signature: signature
      });
    }
  }, [firmName, tagline, getContactInfo, signature, brandingLoading]);

  const loadBrandingSettings = async () => {
    if (!currentFirmId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('wa_sessions')
        .select('firm_name, firm_tagline, contact_info, footer_signature')
        .eq('firm_id', currentFirmId)
        .single();

      if (data) {
        setSettings({
          firm_name: data.firm_name || firmName,
          firm_tagline: data.firm_tagline || tagline,
          contact_info: data.contact_info || getContactInfo(),
          footer_signature: data.footer_signature || signature
        });
      }
    } catch (error) {
      console.error('Error loading branding settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveBrandingSettings = async () => {
    if (!currentFirmId) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('wa_sessions')
        .upsert({
          id: currentFirmId,
          firm_id: currentFirmId,
          ...settings
        });

      if (error) throw error;

      toast({
        title: "Branding Saved",
        description: "WhatsApp branding settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving branding settings:', error);
      toast({
        title: "Error",
        description: "Failed to save branding settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setSettings({
      firm_name: firmName,
      firm_tagline: tagline,
      contact_info: getContactInfo(),
      footer_signature: signature
    });
  };

  const defaultSettings = {
    firm_name: firmName,
    firm_tagline: tagline,
    contact_info: getContactInfo(),
    footer_signature: signature
  };
  
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(defaultSettings);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-muted-foreground">
              Loading branding settings...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Branding Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrushIcon className="h-4 w-4 text-primary" />
            Firm Information
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Customize branding in WhatsApp messages
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Button variant="outline" onClick={resetToDefaults} className="w-full sm:w-auto">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button 
              onClick={saveBrandingSettings} 
              disabled={isSaving || !hasChanges}
              className="w-full sm:w-auto"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firm_name">Firm Name</Label>
              <Input
                id="firm_name"
                value={settings.firm_name}
                onChange={(e) => setSettings(prev => ({ ...prev, firm_name: e.target.value }))}
                placeholder="Your Firm Name"
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                This will appear as the sender name in messages
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="firm_tagline">Firm Tagline</Label>
              <Input
                id="firm_tagline"
                value={settings.firm_tagline}
                onChange={(e) => setSettings(prev => ({ ...prev, firm_tagline: e.target.value }))}
                placeholder="#YourFirmTagline"
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                A memorable hashtag or slogan
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contact_info">Contact Information</Label>
              <Textarea
                id="contact_info"
                value={settings.contact_info}
                onChange={(e) => setSettings(prev => ({ ...prev, contact_info: e.target.value }))}
                placeholder="Contact: +91 98765 43210&#10;Email: your@email.com&#10;Website: www.yoursite.com"
                rows={3}
                disabled={isSaving}
              />
                <p className="text-xs text-muted-foreground">
                  Contact info for messages
                </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="footer_signature">Footer Signature</Label>
              <Input
                id="footer_signature"
                value={settings.footer_signature}
                onChange={(e) => setSettings(prev => ({ ...prev, footer_signature: e.target.value }))}
                placeholder="Your memories, our passion"
                disabled={isSaving}
              />
                <p className="text-xs text-muted-foreground">
                  Closing message for notifications
                </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
          <p className="text-sm text-muted-foreground">
            How messages will appear
          </p>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 p-4 rounded-lg border-2 border-dashed border-border">
            <div className="bg-background p-4 rounded-lg shadow-sm font-mono text-sm">
              <div className="space-y-2">
                <div className="font-bold">*EVENT CONFIRMED*</div>
                <div>Dear *John Doe*,</div>
                <div>Your event has been successfully confirmed:</div>
                <div className="my-3 text-muted-foreground">
                  [Event details would appear here]
                </div>
                <div className="border-t pt-3 space-y-1 text-xs">
                  <div>Thank you for choosing *{settings.firm_name}*</div>
                  <div className="italic">_{settings.firm_tagline}_</div>
                  <div>{settings.contact_info}</div>
                  <div>{settings.footer_signature}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppBranding;