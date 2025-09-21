import React from 'react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useFirmState } from '@/hooks/useFirmState';
import { useAuth } from '@/components/auth/AuthProvider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield01Icon, CreditCardIcon } from 'hugeicons-react';
import { useNavigate } from 'react-router-dom';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  action?: 'write' | 'read';
  feature?: string;
  showAlert?: boolean;
}

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({
  children,
  action = 'write',
  feature = 'this feature',
  showAlert = true,
}) => {
  const { user } = useAuth();
  const { currentFirmId } = useFirmState(user?.id);
  const { subscription, loading, canWrite } = useSubscriptionStatus(currentFirmId || undefined);
  const navigate = useNavigate();

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2 text-muted-foreground">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Checking subscription...</span>
        </div>
      </div>
    );
  }

  // Allow access based on action and subscription status
  const hasReadAccess = subscription?.isActive || subscription?.subscribedOnce === true;
  const hasWriteAccess = canWrite;

  if (action === 'read' && hasReadAccess) {
    return <>{children}</>;
  }

  if (action === 'write' && hasWriteAccess) {
    return <>{children}</>;
  }

  // User cannot write - show upgrade message based on subscribedOnce
  const isTrialExpiry = !subscription?.subscribedOnce;

  const getStatusMessage = () => {
    if (isTrialExpiry) {
      return "Your 3-day trial has expired";
    } else {
      return "Your subscription has expired";
    }
  };

  const getActionMessage = () => {
    if (isTrialExpiry) {
      return "Upgrade to continue using all features, or your data will be deleted in 2 days.";
    } else {
      return "Upgrade your plan to continue adding and modifying data.";
    }
  };

  if (!showAlert) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30">
        <Shield01Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="space-y-3">
          <div>
            <p className="font-semibold text-amber-700 dark:text-amber-300">{getStatusMessage()}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {getActionMessage()}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => navigate('/subscription')}
              className="flex items-center space-x-2"
              size="sm"
            >
              <CreditCardIcon className="h-4 w-4" />
              <span>Upgrade Now</span>
            </Button>
            <p className="text-xs text-muted-foreground flex items-center">
              Need help? Contact: 
              <a 
                href="mailto:pritphoto1985@gmail.com" 
                className="ml-1 text-primary hover:underline"
              >
                pritphoto1985@gmail.com
              </a>
              <span className="mx-1">|</span>
              <a 
                href="tel:+917265072603" 
                className="text-primary hover:underline"
              >
                +91 7265072603
              </a>
            </p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};