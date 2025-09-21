import React from 'react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useFirmState } from '@/hooks/useFirmState';
import { useAuth } from '@/components/auth/AuthProvider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield01Icon, CreditCardIcon, Alert01Icon } from 'hugeicons-react';
import { useNavigate } from 'react-router-dom';

interface SubscriptionBlockerProps {
  children: React.ReactNode;
}

export const SubscriptionBlocker: React.FC<SubscriptionBlockerProps> = ({ children }) => {
  const { user } = useAuth();
  const { currentFirmId } = useFirmState(user?.id);
  const { subscription, loading, initialized } = useSubscriptionStatus(currentFirmId || undefined);
  const navigate = useNavigate();

  // Allow access during initial loading (graceful background loading)
  // Only block when we have confirmed subscription data showing restriction
  if (!initialized || loading) {
    return <>{children}</>;
  }

  // Allow access if:
  // 1. Has active subscription, OR
  // 2. Had a subscription before (subscribedOnce = true) - they can view/edit existing data
  const hasAccess = subscription?.isActive || subscription?.subscribedOnce === true;
  
  if (hasAccess) {
    return <>{children}</>;
  }

  // Only block trial users who never subscribed
  const shouldBlock = subscription?.status === 'expired' && !subscription?.subscribedOnce;

  if (!shouldBlock) {
    return <>{children}</>;
  }

  const getBlockingContent = () => {
    // Only trial users reach this point
    return {
      icon: Alert01Icon,
      title: 'Trial Period Expired',
      message: 'Your 3-day trial has expired. Upgrade now to continue using the platform, or your data will be deleted in 2 days.',
      buttonText: 'Upgrade Now',
      variant: 'destructive' as const
    };
  };

  const content = getBlockingContent();
  const { icon: Icon, title, message, buttonText, variant } = content;

  return (
    <>
      {/* Render the page content in the background but make it non-interactive */}
      <div className="pointer-events-none opacity-50">
        {children}
      </div>
      
      {/* Blocking modal */}
      <Dialog open={true}>
        <DialogContent className="sm:max-w-[500px] [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3 text-xl">
              <Icon className={`h-6 w-6 ${variant === 'destructive' ? 'text-destructive' : 'text-primary'}`} />
              <span>{title}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert className={`${
              variant === 'destructive' 
                ? 'border-destructive/20 bg-destructive/10' 
                : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30'
            }`}>
              <Shield01Icon className={`h-4 w-4 ${
                variant === 'destructive' ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'
              }`} />
              <AlertDescription className="text-sm">
                {message}
              </AlertDescription>
            </Alert>

            <div className="flex flex-col space-y-3">
              <Button
                onClick={() => navigate('/subscription')}
                className="flex items-center justify-center space-x-2"
                variant={variant === 'destructive' ? 'default' : 'default'}
              >
                <CreditCardIcon className="h-4 w-4" />
                <span>{buttonText}</span>
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
    </>
  );
};