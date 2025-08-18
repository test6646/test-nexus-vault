
import { useState, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tick02Icon } from 'hugeicons-react';
import { cn } from '@/lib/utils';

interface AdminPinVerificationProps {
  adminPin: string;
  onPinChange: (pin: string) => void;
  isVerified: boolean;
  onVerificationChange: (verified: boolean) => void;
}

const AdminPinVerification = ({ 
  adminPin, 
  onPinChange, 
  isVerified, 
  onVerificationChange 
}: AdminPinVerificationProps) => {
  const [verifying, setVerifying] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);
  const inputRef = useRef<any>(null);
  const { toast } = useToast();

  const verifyAdminPin = async (pin: string) => {
    if (!pin.trim() || pin.length !== 6) {
      onVerificationChange(false);
      return;
    }

    setVerifying(true);

    try {
      const { data: secretData, error: pinError } = await supabase.functions.invoke('verify-admin-pin', {
        body: { pin }
      });

      if (pinError || !secretData?.valid) {
        setHasAttempted(true);
        onVerificationChange(false);
        return;
      }

      onVerificationChange(true);

    } catch (error: any) {
      
      setHasAttempted(true);
      onVerificationChange(false);
    } finally {
      setVerifying(false);
    }
  };

  const handlePinChange = async (pin: string) => {
    onPinChange(pin);
    
    if (pin.length === 6) {
      await verifyAdminPin(pin);
    } else {
      onVerificationChange(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="adminPin">Admin PIN *</Label>
      <div className="relative flex justify-center">
        <InputOTP
          ref={inputRef}
          maxLength={6}
          value={adminPin}
          onChange={handlePinChange}
          disabled={verifying}
        >
          <InputOTPGroup className={cn(
            "transition-colors duration-300",
            isVerified ? "bg-green-50 border-green-300 rounded-lg" : 
            adminPin.length === 6 && !isVerified ? "bg-red-50 border-red-300 rounded-lg" : ""
          )}>
            <InputOTPSlot index={0} className={cn(
              isVerified ? "border-green-400 bg-green-50" : 
              hasAttempted && adminPin.length === 6 && !isVerified ? "border-red-400 bg-red-50" : ""
            )} />
            <InputOTPSlot index={1} className={cn(
              isVerified ? "border-green-400 bg-green-50" : 
              hasAttempted && adminPin.length === 6 && !isVerified ? "border-red-400 bg-red-50" : ""
            )} />
            <InputOTPSlot index={2} className={cn(
              isVerified ? "border-green-400 bg-green-50" : 
              hasAttempted && adminPin.length === 6 && !isVerified ? "border-red-400 bg-red-50" : ""
            )} />
            <InputOTPSlot index={3} className={cn(
              isVerified ? "border-green-400 bg-green-50" : 
              hasAttempted && adminPin.length === 6 && !isVerified ? "border-red-400 bg-red-50" : ""
            )} />
            <InputOTPSlot index={4} className={cn(
              isVerified ? "border-green-400 bg-green-50" : 
              hasAttempted && adminPin.length === 6 && !isVerified ? "border-red-400 bg-red-50" : ""
            )} />
            <InputOTPSlot index={5} className={cn(
              isVerified ? "border-green-400 bg-green-50" : 
              hasAttempted && adminPin.length === 6 && !isVerified ? "border-red-400 bg-red-50" : ""
            )} />
          </InputOTPGroup>
        </InputOTP>
        {isVerified && (
          <Tick02Icon className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Admin PIN is required to create firms and manage the system
      </p>
    </div>
  );
};

export default AdminPinVerification;
