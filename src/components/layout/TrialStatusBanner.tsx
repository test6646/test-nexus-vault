import React from 'react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useFirmState } from '@/hooks/useFirmState';
import { useAuth } from '@/components/auth/AuthProvider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  Time01Icon, 
  Alert01Icon, 
  CreditCardIcon,
  CrownIcon 
} from 'hugeicons-react';

export const TrialStatusBanner: React.FC = () => {
  const { user } = useAuth();
  const { currentFirmId } = useFirmState(user?.id);
  const { 
    subscription, 
    loading, 
    initialized,
    isTrialExpiring, 
    isSubscriptionExpiring, 
    daysUntilExpiry 
  } = useSubscriptionStatus(currentFirmId || undefined);
  const navigate = useNavigate();

  // Don't show banner if not initialized or loading
  if (!initialized || loading || !subscription) {
    return null;
  }

  // Don't show banner for active paid subscriptions (unless expiring)
  if (subscription.status === 'active' && !isSubscriptionExpiring) {
    return null;
  }

  const getBannerContent = () => {
    if (subscription.status === 'expired') {
      return {
        variant: 'destructive' as const,
        icon: Alert01Icon,
        iconColor: 'text-destructive',
        title: subscription.subscribedOnce ? 'Subscription Expired' : 'Trial Expired',
        message: subscription.subscribedOnce 
          ? 'Your subscription has expired. Upgrade now to continue using all features.'
          : 'Your 3-day trial has expired. Upgrade now or your data will be deleted in 2 days.',
        buttonText: 'Upgrade Now',
        urgent: true
      };
    }
    
    if (subscription.status === 'trial') {
      if (isTrialExpiring) {
        return {
          variant: 'destructive' as const,
          icon: Alert01Icon,
          iconColor: 'text-warning',
          title: 'Trial Expiring Soon',
          message: `Your trial expires in ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'day' : 'days'}. Upgrade now to avoid interruption.`,
          buttonText: 'Upgrade Now',
          urgent: true
        };
      } else {
        return {
          variant: 'default' as const,
          icon: Time01Icon,
          iconColor: 'text-info',
          title: 'Trial Active',
          message: `${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'day' : 'days'} remaining in your trial. Upgrade anytime for continued access.`,
          buttonText: 'View Plans',
          urgent: false
        };
      }
    }
    
    if (subscription.status === 'active' && isSubscriptionExpiring) {
      return {
        variant: 'default' as const,
        icon: CrownIcon,
        iconColor: 'text-warning',
        title: 'Subscription Expiring Soon',
        message: `Your subscription expires in ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'day' : 'days'}. Renew now to avoid interruption.`,
        buttonText: 'Renew Now',
        urgent: true
      };
    }

    return null;
  };

  const bannerContent = getBannerContent();
  
  if (!bannerContent) {
    return null;
  }

  const { variant, icon: Icon, iconColor, title, message, buttonText, urgent } = bannerContent;

  return (
    <div className="w-full bg-background border-b border-border">
      <div className="container mx-auto px-4">
        <Alert 
          className={`
            border-0 rounded-none py-3 px-4
            ${variant === 'destructive' 
              ? 'bg-destructive/10 border-destructive/20' 
              : 'bg-muted/50 border-border'
            }
          `}
        >
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <AlertDescription className="flex items-center justify-between w-full">
            <div className="flex-1">
              <span className="font-medium md:hidden">
                {subscription?.status === 'expired' ? 'Trial Expired' : title}
              </span>
              <span className="font-medium hidden md:inline">{title}:</span>
              <span className="ml-2 text-sm hidden md:inline">{message}</span>
            </div>
            <div className="flex items-center space-x-4">
              {urgent && (
                <span className="text-xs text-muted-foreground hidden sm:block">
                  Need help? Contact: 
                  <a href="mailto:pritphoto1985@gmail.com" className="text-primary hover:underline ml-1">
                    pritphoto1985@gmail.com
                  </a>
                </span>
              )}
              <Button
                size="sm"
                variant={urgent ? "default" : "outline"}
                onClick={() => navigate('/subscription')}
                className="flex items-center space-x-2 shrink-0"
              >
                <CreditCardIcon className="h-3 w-3" />
                <span className="md:hidden">Upgrade</span>
                <span className="hidden md:inline">{buttonText}</span>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};