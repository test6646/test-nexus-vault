import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserIcon, Share04Icon, Message01Icon } from 'hugeicons-react';
import { useToast } from '@/hooks/use-toast';

interface ShareOptionsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDirectToClient: () => Promise<void>;
  onCustomShare: () => Promise<void>;
  title?: string;
  hasClientPhone?: boolean;
}

const ShareOptionsDialog = ({ 
  isOpen, 
  onOpenChange, 
  onDirectToClient, 
  onCustomShare,
  title = "Share Options",
  hasClientPhone = true
}: ShareOptionsDialogProps) => {
  const [isLoading, setIsLoading] = useState<'client' | 'custom' | null>(null);
  const { toast } = useToast();

  const handleDirectToClient = async () => {
    setIsLoading('client');
    try {
      await onDirectToClient();
      onOpenChange(false);
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Failed to share to client. Please try again.';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleCustomShare = async () => {
    setIsLoading('custom');
    try {
      await onCustomShare();
      onOpenChange(false);
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Failed to share. Please try again.';
      toast({
        title: "Error", 
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <Button
            onClick={handleDirectToClient}
            disabled={isLoading !== null || !hasClientPhone}
            className="w-full h-14 rounded-xl text-left justify-start space-x-3"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20">
              <Message01Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium">Direct to Client</div>
              <div className="text-xs opacity-80">
                {hasClientPhone ? "Send via WhatsApp automatically" : "Client phone number required"}
              </div>
            </div>
            {isLoading === 'client' && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
          </Button>

          <Button
            onClick={handleCustomShare}
            disabled={isLoading !== null}
            variant="outline"
            className="w-full h-14 rounded-xl text-left justify-start space-x-3"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
              <Share04Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium">Custom Share</div>
              <div className="text-xs text-muted-foreground">Share via other apps</div>
            </div>
            {isLoading === 'custom' && (
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareOptionsDialog;