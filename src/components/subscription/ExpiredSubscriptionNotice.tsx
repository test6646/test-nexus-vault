import React, { useState } from 'react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useFirmState } from '@/hooks/useFirmState';
import { useAuth } from '@/components/auth/AuthProvider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCardIcon, Alert01Icon, Cancel01Icon } from 'hugeicons-react';
import { useNavigate } from 'react-router-dom';

export const ExpiredSubscriptionNotice: React.FC = () => {
  const { user } = useAuth();
  const { currentFirmId } = useFirmState(user?.id);
  const { subscription, loading } = useSubscriptionStatus(currentFirmId || undefined);
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if loading, no subscription, or already dismissed
  if (loading || !subscription || isDismissed) {
    return null;
  }

  // Only show for expired paid subscriptions (subscribedOnce = true)
  const shouldShow = subscription.status === 'expired' && subscription.subscribedOnce;
  
  if (!shouldShow) {
    return null;
  }

  return (
    <Dialog open={true} onOpenChange={() => setIsDismissed(true)}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3 text-xl">
            <Alert01Icon className="h-6 w-6 text-amber-600" />
            <span>Subscription Expired</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30">
            <Alert01Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-sm">
              Your subscription has expired, but you can still view and edit your existing data. 
              To add new entries and export PDFs, please renew your subscription.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col space-y-3">
            <Button
              onClick={() => {
                setIsDismissed(true);
                navigate('/subscription');
              }}
              className="flex items-center justify-center space-x-2"
            >
              <CreditCardIcon className="h-4 w-4" />
              <span>Renew Subscription</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setIsDismissed(true)}
            >
              Continue with Limited Access
            </Button>
            
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Need help? Contact us at:
              </p>
              <div className="flex justify-center items-center space-x-4 mt-2">
                <a 
                  href="mailto:pritphoto1985@gmail.com" 
                  className="text-xs text-primary hover:underline"
                >
                  pritphoto1985@gmail.com
                </a>
                <span className="text-xs text-muted-foreground">|</span>
                <a 
                  href="tel:+917265072603" 
                  className="text-xs text-primary hover:underline"
                >
                  +91 7265072603
                </a>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};