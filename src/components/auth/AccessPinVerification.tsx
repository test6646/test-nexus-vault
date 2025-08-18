import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LockIcon, Building06Icon } from 'hugeicons-react';
import { cn } from '@/lib/utils';

interface AccessPinVerificationProps {
  onVerified: () => void;
}

const AccessPinVerification = ({ onVerified }: AccessPinVerificationProps) => {
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);
  const { toast } = useToast();

  const verifyAccessPin = async (pinValue: string) => {
    if (!pinValue.trim() || pinValue.length !== 6) {
      return false;
    }

    setVerifying(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-access-pin', {
        body: { pin: pinValue }
      });

      if (error || !data?.valid) {
        setHasAttempted(true);
        toast({
          title: "Invalid Access PIN",
          description: "Please enter the correct 6-digit access PIN.",
          variant: "destructive",
        });
        return false;
      }

      // Store verification in both session and local storage
      sessionStorage.setItem('studio_access_verified', 'true');
      localStorage.setItem('studio_access_verified_local', 'true');
      onVerified();
      return true;

    } catch (error: any) {
      setHasAttempted(true);
      toast({
        title: "Verification Error",
        description: "Unable to verify access PIN. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setVerifying(false);
    }
  };

  const handlePinChange = async (pinValue: string) => {
    setPin(pinValue);
    setHasAttempted(false);
    
    if (pinValue.length === 6) {
      await verifyAccessPin(pinValue);
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-4">
      <Dialog open onOpenChange={() => {}}>
        <DialogContent className="w-[90vw] max-w-md sm:max-w-lg [&>button]:hidden">
          <DialogHeader className="text-center space-y-3">
            <div className="mx-auto mb-4 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-primary/10">
              <Building06Icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-bold">Studio Access Required</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Enter the 6-digit access PIN to continue to PRIT PHOTO
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <Label htmlFor="access-pin" className="flex items-center justify-center gap-2 text-sm font-medium">
                <LockIcon className="w-4 h-4" />
                Access PIN
              </Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={pin}
                  onChange={handlePinChange}
                  disabled={verifying}
                >
                  <InputOTPGroup className={cn(
                    "gap-1 sm:gap-2",
                    hasAttempted && pin.length === 6 ? "opacity-75" : ""
                  )}>
                    <InputOTPSlot index={0} className={cn(
                      "h-10 w-10 sm:h-12 sm:w-12 text-base sm:text-lg font-semibold",
                      hasAttempted && pin.length === 6 ? "border-destructive bg-destructive/10" : ""
                    )} />
                    <InputOTPSlot index={1} className={cn(
                      "h-10 w-10 sm:h-12 sm:w-12 text-base sm:text-lg font-semibold",
                      hasAttempted && pin.length === 6 ? "border-destructive bg-destructive/10" : ""
                    )} />
                    <InputOTPSlot index={2} className={cn(
                      "h-10 w-10 sm:h-12 sm:w-12 text-base sm:text-lg font-semibold",
                      hasAttempted && pin.length === 6 ? "border-destructive bg-destructive/10" : ""
                    )} />
                    <InputOTPSlot index={3} className={cn(
                      "h-10 w-10 sm:h-12 sm:w-12 text-base sm:text-lg font-semibold",
                      hasAttempted && pin.length === 6 ? "border-destructive bg-destructive/10" : ""
                    )} />
                    <InputOTPSlot index={4} className={cn(
                      "h-10 w-10 sm:h-12 sm:w-12 text-base sm:text-lg font-semibold",
                      hasAttempted && pin.length === 6 ? "border-destructive bg-destructive/10" : ""
                    )} />
                    <InputOTPSlot index={5} className={cn(
                      "h-10 w-10 sm:h-12 sm:w-12 text-base sm:text-lg font-semibold",
                      hasAttempted && pin.length === 6 ? "border-destructive bg-destructive/10" : ""
                    )} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {verifying && (
                <p className="text-center text-sm text-muted-foreground">
                  Verifying access PIN...
                </p>
              )}
            </div>
            
            <div className="text-center text-xs text-muted-foreground">
              Contact your studio administrator if you don't have the access PIN
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccessPinVerification;
