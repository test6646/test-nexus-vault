import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loading03Icon, Mail01Icon, SecurityIcon, CheckmarkCircle01Icon, LockPasswordIcon } from 'hugeicons-react';
import { cn } from '@/lib/utils';

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'email' | 'verify-otp' | 'set-password' | 'success';

const ForgotPasswordDialog = ({ open, onOpenChange }: ForgotPasswordDialogProps) => {
  const [currentStep, setCurrentStep] = useState<Step>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpStatus, setOtpStatus] = useState<'idle' | 'error' | 'success'>('idle');
  const { toast } = useToast();

  const resetDialog = () => {
    setCurrentStep('email');
    setEmail('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setOtpStatus('idle');
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-otp', {
        body: { email: email.toLowerCase().trim() }
      });

      if (error) throw error;

      toast({
        title: "OTP Sent",
        description: "Check your email for the verification code",
      });
      setCurrentStep('verify-otp');
    } catch (error: any) {
      toast({
        title: "Failed to send OTP",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpCode || otpCode.length !== 6) {
      setOtpStatus('error');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp-only', {
        body: {
          email: email.toLowerCase().trim(),
          otp_code: otpCode
        }
      });

      if (error) throw error;

      if (data?.valid) {
        setOtpStatus('success');
        setTimeout(() => {
          setCurrentStep('set-password');
        }, 500);
      } else {
        setOtpStatus('error');
      }
    } catch (error: any) {
      setOtpStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast({
        title: "All fields required",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('verify-otp-reset', {
        body: {
          email: email.toLowerCase().trim(),
          otp_code: otpCode,
          new_password: newPassword
        }
      });

      if (error) throw error;

      setCurrentStep('success');
      toast({
        title: "Password Reset Successful",
        description: "You can now sign in with your new password",
      });
    } catch (error: any) {
      toast({
        title: "Failed to reset password",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetDialog, 300);
  };

  const handleOtpChange = (value: string) => {
    setOtpCode(value);
    if (otpStatus !== 'idle') {
      setOtpStatus('idle');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentStep === 'email' && <Mail01Icon className="w-5 h-5" />}
            {currentStep === 'verify-otp' && <SecurityIcon className="w-5 h-5" />}
            {currentStep === 'set-password' && <LockPasswordIcon className="w-5 h-5" />}
            {currentStep === 'success' && <CheckmarkCircle01Icon className="w-5 h-5 text-green-600" />}
            {currentStep === 'email' && 'Reset Password'}
            {currentStep === 'verify-otp' && 'Verify Code'}
            {currentStep === 'set-password' && 'Set New Password'}
            {currentStep === 'success' && 'Password Reset Complete'}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 'email' && 'Enter your email address to receive an OTP code'}
            {currentStep === 'verify-otp' && 'Enter the 6-digit code sent to your email'}
            {currentStep === 'set-password' && 'Create your new password'}
            {currentStep === 'success' && 'Your password has been successfully updated'}
          </DialogDescription>
        </DialogHeader>

        {currentStep === 'email' && (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email Address</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-full px-4"
              />
            </div>
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                className="flex-1 rounded-full"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !email.trim()}
                className="flex-1 rounded-full"
              >
                {isLoading ? (
                  <>
                    <Loading03Icon className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send OTP'
                )}
              </Button>
            </div>
          </form>
        )}

        {currentStep === 'verify-otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="space-y-2">
              <Label>Verification Code</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={handleOtpChange}
                  className={cn(
                    "transition-colors",
                    otpStatus === 'error' && "[&>div>div]:border-red-500",
                    otpStatus === 'success' && "[&>div>div]:border-green-500"
                  )}
                >
                  <InputOTPGroup className="gap-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className={cn(
                          "w-12 h-12 !rounded-full text-center border-2 transition-all duration-200",
                          "first:!rounded-full first:!border-2 last:!rounded-full", // Override default first/last styling
                          otpStatus === 'error' && "border-red-500 bg-red-50 text-red-700",
                          otpStatus === 'success' && "border-green-500 bg-green-50 text-green-700",
                          otpStatus === 'idle' && "border-input"
                        )}
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Code sent to {email}
              </p>
              {otpStatus === 'error' && (
                <p className="text-xs text-red-600 text-center">
                  Invalid code. Please try again.
                </p>
              )}
              {otpStatus === 'success' && (
                <p className="text-xs text-green-600 text-center">
                  Code verified successfully!
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setCurrentStep('email')}
                className="flex-1 rounded-full"
              >
                Back
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || otpCode.length !== 6}
                className="flex-1 rounded-full"
              >
                {isLoading ? (
                  <>
                    <Loading03Icon className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </Button>
            </div>
          </form>
        )}

        {currentStep === 'set-password' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="h-11 rounded-full px-4"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-11 rounded-full px-4"
              />
            </div>

            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setCurrentStep('verify-otp')}
                className="flex-1 rounded-full"
              >
                Back
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="flex-1 rounded-full"
              >
                {isLoading ? (
                  <>
                    <Loading03Icon className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </div>
          </form>
        )}

        {currentStep === 'success' && (
          <div className="space-y-4 text-center">
            <div className="bg-green-50 p-4 rounded-lg">
              <CheckmarkCircle01Icon className="w-12 h-12 text-green-600 mx-auto mb-2" />
              <p className="text-green-800 font-medium">
                Password reset successful!
              </p>
              <p className="text-green-600 text-sm mt-1">
                You can now sign in with your new password
              </p>
            </div>
            <Button 
              onClick={handleClose}
              className="w-full rounded-full"
            >
              Continue to Sign In
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordDialog;