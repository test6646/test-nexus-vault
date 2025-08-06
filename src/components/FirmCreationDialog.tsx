
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loading03Icon, Add01Icon, Cancel01Icon } from 'hugeicons-react';

interface FirmCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFirmCreated: () => void;
}

const FirmCreationDialog = ({ open, onOpenChange, onFirmCreated }: FirmCreationDialogProps) => {
  const [firmName, setFirmName] = useState('');
  const [spreadsheetInput, setSpreadsheetInput] = useState('');
  const [calendarEmail, setCalendarEmail] = useState('');
  const [emails, setEmails] = useState<string[]>(['']);
  const [isLoading, setIsLoading] = useState(false);
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
        console.error('❌ Session error:', sessionError);
        throw new Error(`Authentication error: ${sessionError.message}`);
      }

      if (!sessionData.session) {
        console.error('❌ No active session found');
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
          spreadsheetInput: spreadsheetInput.trim(),
          calendarEmail: calendarEmail.trim(),
          memberEmails: emails.filter(email => email.trim() !== ''),
        },
      });

      

      if (error) {
        console.error('❌ Edge function error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Edge Function error: ${error.message || JSON.stringify(error)}`);
      }

      if (!data?.success) {
        console.error('❌ Firm creation failed:', data);
        throw new Error(data?.error || 'Unknown error occurred during firm creation');
      }

      

      toast({
        title: "Success!",
        description: `Firm "${firmName}" has been created successfully!`,
      });

      setFirmName('');
      setSpreadsheetInput('');
      setCalendarEmail('');
      setEmails(['']);
      onOpenChange(false);
      onFirmCreated();

    } catch (error: any) {
      console.error('💥 Firm creation error:', error);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Firm</DialogTitle>
          <DialogDescription>
            Create a new photography firm to start managing your business
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firmName">Firm Name</Label>
            <Input
              id="firmName"
              type="text"
              placeholder="Enter firm name"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="spreadsheetInput">Google Spreadsheet ID or URL</Label>
            <Input
              id="spreadsheetInput"
              type="text"
              placeholder="Enter spreadsheet ID or full URL"
              value={spreadsheetInput}
              onChange={(e) => setSpreadsheetInput(e.target.value)}
              disabled={isLoading}
              required
            />
            <p className="text-sm text-muted-foreground">
              You can paste either the full Google Sheets URL or just the spreadsheet ID
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="calendarEmail">Calendar Sharing Email *</Label>
            <Input
              id="calendarEmail"
              type="email"
              placeholder="Enter email for calendar access"
              value={calendarEmail}
              onChange={(e) => setCalendarEmail(e.target.value)}
              disabled={isLoading}
              required
            />
            <p className="text-sm text-muted-foreground">
              This email will receive access to the shared Google Calendar
            </p>
          </div>

          <div className="space-y-2">
            <Label>Team Member Emails (Optional)</Label>
            {emails.map((email, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => updateEmail(index, e.target.value)}
                  disabled={isLoading}
                />
                {emails.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeEmailField(index)}
                    disabled={isLoading}
                  >
                    <Cancel01Icon className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addEmailField}
              disabled={isLoading}
              className="w-full"
            >
              <Add01Icon className="h-4 w-4 mr-2" />
              Add Another Email
            </Button>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
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
