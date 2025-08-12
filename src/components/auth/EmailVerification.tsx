
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail01Icon, Loading02Icon, Tick02Icon } from 'hugeicons-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EmailVerificationProps {
  email: string;
  onVerificationComplete: () => void;
}

export const EmailVerification = ({ email, onVerificationComplete }: EmailVerificationProps) => {
  const [isResending, setIsResending] = useState(false);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const { toast } = useToast();

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });
      
      if (error) throw error;
      
      setLastSent(new Date());
      toast({
        title: "Verification email sent",
        description: "Please check your email for the verification link.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email_confirmed_at) {
        onVerificationComplete();
      } else {
        toast({
          title: "Email not verified yet",
          description: "Please check your email and click the verification link.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const canResend = !lastSent || (Date.now() - lastSent.getTime()) > 60000; // 1 minute cooldown

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Mail01Icon className="w-6 h-6 text-primary" />
        </div>
        <CardTitle>Check Your Email</CardTitle>
        <CardDescription>
          We've sent a verification link to <strong>{email}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Tick02Icon className="h-4 w-4" />
          <AlertDescription>
            Click the verification link in your email to activate your account. 
            You may need to check your spam folder.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <Button 
            onClick={handleCheckVerification}
            className="w-full"
            variant="default"
          >
            I've Verified My Email
          </Button>

          <Button
            onClick={handleResendEmail}
            disabled={isResending || !canResend}
            variant="outline"
            className="w-full"
          >
            {isResending ? (
              <>
                <Loading02Icon className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Resend Verification Email'
            )}
          </Button>

          {lastSent && (
            <p className="text-sm text-muted-foreground text-center">
              Last sent {new Date(lastSent).toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Wrong email address?{' '}
            <Button variant="link" className="p-0 h-auto text-sm" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
