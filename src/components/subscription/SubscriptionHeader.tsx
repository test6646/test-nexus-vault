import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield01Icon, 
  Calendar01Icon,
  Alert01Icon,
  Clock02Icon,
  CheckmarkCircle01Icon
} from 'hugeicons-react';

interface SubscriptionHeaderProps {
  subscription: any;
  currentPlan: any;
  daysUntilExpiry: number | null;
  isTrialExpiring: boolean;
  isSubscriptionExpiring: boolean;
}

export const SubscriptionHeader: React.FC<SubscriptionHeaderProps> = ({
  subscription,
  currentPlan,
  daysUntilExpiry,
  isTrialExpiring,
  isSubscriptionExpiring
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = () => {
    if (!subscription) return null;

    switch (subscription.status) {
      case 'trial':
        return <StatusBadge status="trial-active" variant="subtle" />;
      case 'active':
        return <StatusBadge status="subscription-active" variant="subtle" />;
      case 'expired':
        return <StatusBadge status="subscription-expired" variant="subtle" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text">
            Subscription Management
          </h1>
          <p className="text-muted-foreground text-lg mt-2">
            Manage your plan and billing preferences
          </p>
        </div>
        <div className="flex items-center">
          {getStatusBadge()}
        </div>
      </div>

      {/* Current Status Card */}
      {subscription && (
        <Card className="border-2 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <Shield01Icon className="h-6 w-6 text-primary" />
              <span>Current Subscription Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="flex items-center space-x-2">
                  {getStatusBadge()}
                </div>
              </div>
              
              {subscription.status === 'active' && currentPlan && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
                  <div className="flex items-center space-x-2">
                    <CheckmarkCircle01Icon className="h-5 w-5 text-success" />
                    <p className="text-lg font-semibold text-success">
                      {currentPlan.display_name}
                    </p>
                  </div>
                </div>
              )}
              
              {daysUntilExpiry !== null && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {subscription.status === 'trial' ? 'Trial expires in' : 'Renews in'}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Clock02Icon className="h-5 w-5 text-primary" />
                    <p className="text-lg font-semibold">
                      {daysUntilExpiry} {daysUntilExpiry === 1 ? 'day' : 'days'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {(subscription.trialEndAt || subscription.subscriptionEndAt) && (
              <div className="pt-4 border-t">
                <div className="flex items-center space-x-3 text-muted-foreground">
                  <Calendar01Icon className="h-5 w-5" />
                  <span className="text-sm">
                    {subscription.status === 'trial' 
                      ? `Trial ends on ${formatDate(subscription.trialEndAt!)}`
                      : subscription.subscriptionEndAt 
                      ? `Subscription ${subscription.status === 'expired' ? 'ended' : 'ends'} on ${formatDate(subscription.subscriptionEndAt)}`
                      : ''
                    }
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Alert for expiring/expired subscriptions */}
      {(isTrialExpiring || isSubscriptionExpiring || subscription?.status === 'expired') && (
        <Alert className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:border-amber-800 dark:from-amber-900/30 dark:to-orange-900/30">
          <Alert01Icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            {subscription?.status === 'expired' ? (
              <span>
                <strong>Your subscription has expired.</strong> Upgrade now to continue using all features.
                {!subscription.subscribedOnce && (
                  <span className="block mt-2 text-red-600 dark:text-red-400 font-semibold">
                    ⚠️ Data will be permanently deleted in 2 days if no payment is made.
                  </span>
                )}
              </span>
            ) : isTrialExpiring ? (
              <span><strong>Your trial is expiring soon.</strong> Upgrade now to avoid interruption.</span>
            ) : (
              <span><strong>Your subscription is expiring soon.</strong> Consider renewing to avoid interruption.</span>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};