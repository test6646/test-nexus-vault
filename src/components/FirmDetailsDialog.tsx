import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loading03Icon, Upload01Icon, Image01Icon, Delete02Icon } from 'hugeicons-react';
import { BUSINESS_DEFAULTS } from '@/config/business-defaults';

interface FirmDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firmId: string;
  onSuccess: () => void;
}

const FirmDetailsDialog = ({ open, onOpenChange, firmId, onSuccess }: FirmDetailsDialogProps) => {
  const [firmName, setFirmName] = useState('');
  const [tagline, setTagline] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [headerLeftContent, setHeaderLeftContent] = useState('');
  const [footerContent, setFooterContent] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfscCode, setBankIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load firm data when dialog opens
  useEffect(() => {
    if (open && firmId) {
      loadFirmData();
    }
  }, [open, firmId]);

  const loadFirmData = async () => {
    setIsLoadingData(true);
    try {
      const { data: firm, error } = await supabase
        .from('firms')
        .select('*, contact_phone, contact_email, tagline')
        .eq('id', firmId)
        .maybeSingle();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load firm details",
          variant: "destructive",
        });
        return;
      }

      if (firm) {
        setFirmName(firm.name || '');
        setTagline((firm as any).tagline || firm.description || '');
        setContactPhone((firm as any).contact_phone || '');
        setContactEmail((firm as any).contact_email || '');
        setHeaderLeftContent(firm.header_left_content || `Contact: ${BUSINESS_DEFAULTS.CONTACT_PHONE}\nEmail: ${BUSINESS_DEFAULTS.CONTACT_EMAIL}`);
        setFooterContent(firm.footer_content || `${firm.name} | Contact: ${BUSINESS_DEFAULTS.CONTACT_PHONE} | Email: ${BUSINESS_DEFAULTS.CONTACT_EMAIL}\n${BUSINESS_DEFAULTS.TAGLINE} | ${BUSINESS_DEFAULTS.SIGNATURE}`);
        setUpiId((firm as any).upi_id || '');
        setBankAccountName((firm as any).bank_account_name || '');
        setBankAccountNumber((firm as any).bank_account_number || '');
        setBankIfscCode((firm as any).bank_ifsc_code || '');
        setBankName((firm as any).bank_name || '');
        setCurrentLogoUrl(firm.logo_url);
        setLogoPreview(null); // Reset preview for new upload
        setLogoFile(null);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load firm details",
        variant: "destructive",
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (PNG only)
    if (file.type !== 'image/png') {
      toast({
        title: "Invalid file type",
        description: "Please select a PNG image file only",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setLogoFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = async () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Delete current logo from storage if it exists
    if (currentLogoUrl && firmId) {
      try {
        const fileName = `${firmId}/logo.png`;
        await supabase.storage
          .from('firm-logos')
          .remove([fileName]);
        
        // Update database to remove logo URL
        await supabase
          .from('firms')
          .update({ logo_url: null })
          .eq('id', firmId);
        
        setCurrentLogoUrl(null);
        
        toast({
          title: "Success",
          description: "Logo removed successfully",
        });
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to remove logo from storage",
          variant: "destructive",
        });
      }
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return null;

    const fileExt = 'png';
    const fileName = `${firmId}/logo.${fileExt}`;

    try {
      // First, remove the existing logo if it exists to ensure clean replacement
      if (currentLogoUrl) {
        await supabase.storage
          .from('firm-logos')
          .remove([fileName]);
      }

      // Upload the new logo
      const { data, error } = await supabase.storage
        .from('firm-logos')
        .upload(fileName, logoFile, {
          cacheControl: '0', // Disable caching for immediate updates
          upsert: true
        });

      if (error) {
        throw new Error(`Logo upload failed: ${error.message}`);
      }

      // Get the public URL with cache busting timestamp
      const { data: urlData } = supabase.storage
        .from('firm-logos')
        .getPublicUrl(fileName);

      // Add timestamp to force cache refresh
      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      
      return logoUrl;
    } catch (error: any) {
      throw new Error(`Logo upload failed: ${error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firmName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a firm name",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      let logoUrl = currentLogoUrl;

      // Upload new logo if provided
      if (logoFile) {
        logoUrl = await uploadLogo();
        // Update current logo URL state immediately
        setCurrentLogoUrl(logoUrl);
      }

      // Update firm details with new dedicated contact fields
      const { error } = await supabase
        .from('firms')
        .update({
          name: firmName.trim(),
          tagline: tagline.trim(),
          contact_phone: contactPhone.trim(),
          contact_email: contactEmail.trim(),
          // Keep backward compatibility
          description: tagline.trim(),
          logo_url: logoUrl,
          header_left_content: headerLeftContent.trim(),
          footer_content: footerContent.trim(),
          upi_id: upiId.trim(),
          bank_account_name: bankAccountName.trim(),
          bank_account_number: bankAccountNumber.trim(),
          bank_ifsc_code: bankIfscCode.trim(),
          bank_name: bankName.trim()
        })
        .eq('id', firmId);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Firm details updated successfully",
      });

      onOpenChange(false);
      onSuccess();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update firm details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLogo = () => {
    if (logoPreview) return logoPreview;
    if (currentLogoUrl) return currentLogoUrl;
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] md:max-w-[600px] max-h-[70vh] md:max-h-[90vh] overflow-y-auto mx-auto flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-base">Firm Details & Branding</DialogTitle>
        </DialogHeader>
        
        {isLoadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loading03Icon className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 min-h-0">
            {/* Basic Information */}
            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firmName" className="text-xs sm:text-sm font-medium">Firm Name *</Label>
                <Input
                  id="firmName"
                  type="text"
                  placeholder="Enter your firm name"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline" className="text-xs sm:text-sm font-medium">Tagline</Label>
                <Input
                  id="tagline"
                  type="text"
                  placeholder="Your business tagline (e.g., 'Capturing Life's Beautiful Moments')"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs sm:text-sm text-muted-foreground">
                  This will appear on your invoices and notifications
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPhone" className="text-xs sm:text-sm font-medium">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail" className="text-xs sm:text-sm font-medium">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="studio@yourfirm.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-medium">Firm Logo (PNG only)</Label>
              <Card className="border-dashed border-2 border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
                <CardContent className="p-4 sm:p-6">
                  {getCurrentLogo() ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center">
                        <div className="relative">
                          <img
                            src={getCurrentLogo()!}
                            alt="Logo preview"
                            className="h-24 w-auto max-w-[200px] object-contain rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                            onClick={removeLogo}
                            disabled={isLoading}
                          >
                            <Delete02Icon className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-center">
                        {logoFile && (
                          <>
                            <p className="text-sm text-muted-foreground">{logoFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {`${(logoFile.size / 1024 / 1024).toFixed(2)} MB`}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-3">
                      <div className="flex justify-center">
                        <Image01Icon className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Upload your firm logo</p>
                        <p className="text-xs text-muted-foreground">
                          PNG format only, max 5MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                        className="mt-2"
                      >
                        <Upload01Icon className="h-4 w-4 mr-2" />
                        Choose File
                      </Button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png"
                    onChange={handleLogoSelect}
                    className="hidden"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Header Content */}
            <div className="space-y-2">
              <Label htmlFor="headerLeftContent" className="text-xs sm:text-sm font-medium">Header Contact Information</Label>
              <Textarea
                id="headerLeftContent"
                placeholder="Contact: +91 12345 67890&#10;Email: your@email.com"
                value={headerLeftContent}
                onChange={(e) => setHeaderLeftContent(e.target.value)}
                disabled={isLoading}
                rows={3}
              />
              <p className="text-xs sm:text-sm text-muted-foreground">
                This appears in the top-right section of all PDF documents. Use line breaks for multiple lines.
              </p>
            </div>

            {/* Header Preview */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-medium">Header Preview</Label>
              <div className="p-3 sm:p-4 bg-white border rounded-lg text-sm sm:text-base" style={{ fontFamily: 'Lexend, sans-serif' }}>
                <div className="flex flex-row justify-between items-center pb-2 border-b-2" style={{ borderBottomColor: '#c4b28d' }}>
                  <div className="flex items-center">
                    {getCurrentLogo() && (
                      <img 
                        src={getCurrentLogo()!} 
                        alt="Logo" 
                        className="h-12 w-auto max-w-[120px] object-contain"
                      />
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-primary">{firmName.toUpperCase()}</div>
                    {headerLeftContent.split('\n').map((line, index) => (
                      <div key={index} className="text-xs text-gray-600">{line}</div>
                    ))}
                    <div className="text-xs font-medium text-primary mt-1">{tagline}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Content */}
            <div className="space-y-2">
              <Label htmlFor="footerContent" className="text-xs sm:text-sm font-medium">Footer Content</Label>
              <Textarea
                id="footerContent"
                placeholder="Your Company Name | Contact: +91 12345 67890 | Email: your@email.com&#10;Your tagline or motto"
                value={footerContent}
                onChange={(e) => setFooterContent(e.target.value)}
                disabled={isLoading}
                rows={3}
              />
              <p className="text-xs sm:text-sm text-muted-foreground">
                This appears at the bottom of all PDF documents. Use line breaks for multiple lines.
              </p>
            </div>

            {/* Footer Preview */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-medium">Footer Preview</Label>
              <div className="p-3 bg-white border rounded-lg border-t" style={{ fontFamily: 'Lexend, sans-serif', borderTopColor: '#e0e0e0' }}>
                <div className="text-center text-xs text-gray-500 pt-2">
                  {footerContent.split('\n').map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Banking & Payment Details Section */}
            <div className="space-y-6 border-t pt-6">
              <h3 className="text-lg font-semibold text-foreground">Banking & Payment Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="upiId" className="text-xs sm:text-sm font-medium">UPI ID</Label>
                  <Input
                    id="upiId"
                    placeholder="yourname@okicici"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankAccountName" className="text-xs sm:text-sm font-medium">Account Holder Name</Label>
                  <Input
                    id="bankAccountName"
                    placeholder="JOHN DOE"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankAccountNumber" className="text-xs sm:text-sm font-medium">Account Number</Label>
                  <Input
                    id="bankAccountNumber"
                    placeholder="1234567890"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankIfscCode" className="text-xs sm:text-sm font-medium">IFSC Code</Label>
                  <Input
                    id="bankIfscCode"
                    placeholder="ICIC0001234"
                    value={bankIfscCode}
                    onChange={(e) => setBankIfscCode(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bankName" className="text-xs sm:text-sm font-medium">Bank Name</Label>
                  <Input
                    id="bankName"
                    placeholder="ICICI Bank"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !firmName.trim()}>
                {isLoading ? (
                  <>
                    <Loading03Icon className="h-4 w-4 animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  'Update Details'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FirmDetailsDialog;
