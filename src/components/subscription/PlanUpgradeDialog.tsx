import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowUp01Icon, 
  Calendar01Icon, 
  CreditCardIcon,
  Tick01Icon,
  StarIcon 
} from 'hugeicons-react';
import { SubscriptionPlan } from '@/hooks/useSubscriptionPlans';
import { UNIFIED_SUBSCRIPTION_FEATURES } from '@/config/subscription-features';

interface PlanUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: SubscriptionPlan | null;
  targetPlan: SubscriptionPlan;
  remainingDays: number;
  extendedDays: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const PlanUpgradeDialog: React.FC<PlanUpgradeDialogProps> = ({
  open,
  onOpenChange,
  currentPlan,
  targetPlan,
  remainingDays,
  extendedDays,
  onConfirm,
  onCancel,
  loading = false
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isUpgrade = currentPlan && targetPlan ? targetPlan.duration_months > currentPlan.duration_months : true;
  const actionText = isUpgrade ? 'Upgrade' : 'Change';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {isUpgrade ? (
              <ArrowUp01Icon className="h-5 w-5 text-primary" />
            ) : (
              <CreditCardIcon className="h-5 w-5 text-primary" />
            )}
            <span>{actionText} Subscription Plan</span>
          </DialogTitle>
          <DialogDescription>
            Review the changes to your subscription before proceeding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Plan Comparison */}
          <div className="space-y-4">
            {currentPlan && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="font-semibold">{currentPlan.display_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(currentPlan.price)}</p>
                  <p className="text-sm text-muted-foreground">
                    /{currentPlan.duration_months} month{currentPlan.duration_months > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center">
              <ArrowUp01Icon className="h-4 w-4 text-muted-foreground" />
            </div>

            {targetPlan && (
              <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">New Plan</p>
                  <p className="font-semibold text-primary">{targetPlan.display_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">{formatCurrency(targetPlan.price)}</p>
                  <p className="text-sm text-muted-foreground">
                    /{targetPlan.duration_months} month{targetPlan.duration_months > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Benefits Summary */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center space-x-2">
              <StarIcon className="h-4 w-4 text-primary" />
              <span>What You Get</span>
            </h4>
            
            {remainingDays > 0 && extendedDays > 0 && (
              <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar01Icon className="h-4 w-4 text-success" />
                  <span className="font-medium text-success">Bonus Days Added!</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your {remainingDays} remaining days will be extended to <strong>{extendedDays} extra days</strong> 
                  with your new plan period.
                </p>
              </div>
            )}

            <div className="space-y-2">
              {UNIFIED_SUBSCRIPTION_FEATURES.slice(0, 5).map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Tick01Icon className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
              <div className="text-sm text-muted-foreground">
                + {UNIFIED_SUBSCRIPTION_FEATURES.length - 5} more features
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Summary */}
          {targetPlan && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Amount to Pay</span>
                <span className="font-semibold">{formatCurrency(targetPlan.price)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Billing Period</span>
                <span className="font-semibold">
                  {targetPlan.duration_months} month{targetPlan.duration_months > 1 ? 's' : ''}
                </span>
              </div>
              {isUpgrade && (
                <div className="flex items-center justify-between text-success">
                  <span className="text-sm">Monthly Savings</span>
                  <Badge variant="secondary" className="bg-success/10 text-success">
                    Better Value
                  </Badge>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <CreditCardIcon className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Processing...' : `${actionText} Plan`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};