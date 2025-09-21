
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loading03Icon, Add01Icon, Cancel01Icon, Upload01Icon, Image01Icon, Delete02Icon } from 'hugeicons-react';

interface FirmCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFirmCreated: () => void;
}

const FirmCreationDialog = ({ open, onOpenChange, onFirmCreated }: FirmCreationDialogProps) => {
  const [firmName, setFirmName] = useState('');
  const [description, setDescription] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [spreadsheetInput, setSpreadsheetInput] = useState('');
  const [calendarEmail, setCalendarEmail] = useState('');
  const [emails, setEmails] = useState<string[]>(['']);
  
  // Bank details
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIFSC, setBankIFSC] = useState('');
  const [bankName, setBankName] = useState('');
  const [upiId, setUpiId] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const addEmailField = () => {
    setEmails([...emails, '']);
  };

  const removeEmailField = (index: number) => {
    if (emails.length > 1) {
      setEmails(emails.filter((_, i) => i !== index));
    }
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
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

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadLogo = async (firmId: string): Promise<string | null> => {
    if (!logoFile) return null;

    const fileExt = 'png';
    const fileName = `${firmId}/logo.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('firm-logos')
      .upload(fileName, logoFile, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      throw new Error(`Logo upload failed: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('firm-logos')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
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

    if (!contactPhone.trim()) {
      toast({
        title: "Error",
        description: "Please enter a contact phone number",
        variant: "destructive",
      });
      return;
    }

    if (!contactEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter a contact email",
        variant: "destructive",
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: "Error",
        description: "Please enter a firm tagline",
        variant: "destructive",
      });
      return;
    }

    if (!spreadsheetInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Google Spreadsheet ID or URL",
        variant: "destructive",
      });
      return;
    }

    if (!calendarEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter a calendar sharing email",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      
      
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Authentication error: ${sessionError.message}`);
      }

      if (!sessionData.session) {
        throw new Error('No active session. Please log in again.');
      }

      const payloadData = {
        firmName: firmName.trim(),
        spreadsheetInput: spreadsheetInput.trim(),
        memberEmails: emails.filter(email => email.trim() !== ''),
      };

      const { data, error } = await supabase.functions.invoke('create-firm-with-sheets', {
        body: {
          firmName: firmName.trim(),
          description: description.trim(),
          contactPhone: contactPhone.trim(),
          contactEmail: contactEmail.trim(),
          spreadsheetInput: spreadsheetInput.trim(),
          calendarEmail: calendarEmail.trim(),
          memberEmails: [],
          bankAccountName: bankAccountName.trim(),
          bankAccountNumber: bankAccountNumber.trim(),
          bankIFSC: bankIFSC.trim(),
          bankName: bankName.trim(),
          upiId: upiId.trim(),
        },
      });

      if (error) {
        throw new Error(`Edge Function error: ${error.message || JSON.stringify(error)}`);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Unknown error occurred during firm creation');
      }

      // Upload logo if provided
      if (logoFile && data.firmId) {
        try {
          const logoUrl = await uploadLogo(data.firmId);
          if (logoUrl) {
            await supabase
              .from('firms')
              .update({ logo_url: logoUrl })
              .eq('id', data.firmId);
          }
        } catch (logoError: any) {
          toast({
            title: "Firm created but logo upload failed",
            description: "You can upload the logo later from firm settings",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Success!",
        description: `Firm "${firmName}" has been created successfully!`,
      });

      setFirmName('');
      setDescription('');
      setContactPhone('');
      setContactEmail('');
      setLogoFile(null);
      setLogoPreview(null);
      setSpreadsheetInput('');
      setCalendarEmail('');
      setEmails(['']);
      setBankAccountName('');
      setBankAccountNumber('');
      setBankIFSC('');
      setBankName('');
      setUpiId('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onOpenChange(false);
      onFirmCreated();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create firm. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] md:max-w-[600px] max-h-[70vh] md:max-h-[90vh] overflow-y-auto mx-auto">
        <DialogHeader>
          <DialogTitle>Create New Firm</DialogTitle>
          <DialogDescription>
            Create a new photography firm to start managing your business
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firmName" className="text-sm font-medium">Firm Name *</Label>
                  <Input
                    id="firmName"
                    type="text"
                    placeholder="Enter your firm name"
                    value={firmName}
                    onChange={(e) => setFirmName(e.target.value)}
                    disabled={isLoading}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                <Label htmlFor="description" className="text-xs sm:text-sm font-medium">Firm Tagline *</Label>
                <Input
                  id="description"
                  type="text"
                  placeholder="Your business tagline (e.g., 'Capturing Life's Beautiful Moments')"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-11"
                />
                </div>
              </div>
              
              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPhone" className="text-sm font-medium">Contact Phone *</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    disabled={isLoading}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail" className="text-sm font-medium">Contact Email *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="studio@yourfirm.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    className="h-11"
                  />
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                This information will appear on your invoices, quotations, and notifications
              </p>
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Firm Logo (PNG only)</Label>
              <Card className="border-dashed border-2 border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
                <CardContent className="p-6">
                  {logoPreview ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center">
                        <div className="relative">
                          <img
                            src={logoPreview}
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
                        <p className="text-sm text-muted-foreground">{logoFile?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {logoFile && `${(logoFile.size / 1024 / 1024).toFixed(2)} MB`}
                        </p>
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

            {/* Integration Settings */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="spreadsheetInput" className="text-sm font-medium">Google Spreadsheet ID *</Label>
                  <Input
                    id="spreadsheetInput"
                    type="text"
                    placeholder="Enter spreadsheet ID or URL"
                    value={spreadsheetInput}
                    onChange={(e) => setSpreadsheetInput(e.target.value)}
                    disabled={isLoading}
                    required
                    className="h-11"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="calendarEmail" className="text-sm font-medium">Calendar Sharing Email *</Label>
                  <Input
                    id="calendarEmail"
                    type="email"
                    placeholder="Enter email for calendar access"
                    value={calendarEmail}
                    onChange={(e) => setCalendarEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    className="h-11"
                  />
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Bank Account Details</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankAccountName" className="text-xs text-muted-foreground">Account Holder Name</Label>
                    <Input
                      id="bankAccountName"
                      type="text"
                      placeholder="Account holder name"
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                      disabled={isLoading}
                      className="h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bankAccountNumber" className="text-xs text-muted-foreground">Account Number</Label>
                    <Input
                      id="bankAccountNumber"
                      type="text"
                      placeholder="Bank account number"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      disabled={isLoading}
                      className="h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bankIFSC" className="text-xs text-muted-foreground">IFSC Code</Label>
                    <Input
                      id="bankIFSC"
                      type="text"
                      placeholder="Bank IFSC code"
                      value={bankIFSC}
                      onChange={(e) => setBankIFSC(e.target.value)}
                      disabled={isLoading}
                      className="h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bankName" className="text-xs text-muted-foreground">Bank Name</Label>
                    <Input
                      id="bankName"
                      type="text"
                      placeholder="Bank name"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      disabled={isLoading}
                      className="h-11"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="upiId" className="text-xs text-muted-foreground">UPI ID (Optional)</Label>
                  <Input
                    id="upiId"
                    type="text"
                    placeholder="your-upi@bank"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    disabled={isLoading}
                    className="h-11"
                  />
                </div>
              </div>
            </div>
          </div>


          <div className="grid grid-cols-2 gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loading03Icon className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Firm'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FirmCreationDialog;
