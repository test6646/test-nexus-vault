import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Tick01Icon, 
  CreditCardIcon,
  CheckmarkCircle01Icon
} from 'hugeicons-react';
import { SubscriptionPlan } from '@/hooks/useSubscriptionPlans';
import { UNIFIED_SUBSCRIPTION_FEATURES } from '@/config/subscription-features';

interface SubscriptionPlanCardProps {
  plan: SubscriptionPlan;
  isCurrentPlan: boolean;
  isPopular: boolean;
  monthlyPrice: number;
  savings: number;
  processingPlan: string | null;
  onSelectPlan: (planId: string) => void;
  showUpgradeButton?: boolean;
}

export const SubscriptionPlanCard: React.FC<SubscriptionPlanCardProps> = ({
  plan,
  isCurrentPlan,
  isPopular,
  monthlyPrice,
  savings,
  processingPlan,
  onSelectPlan,
  showUpgradeButton = true
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card 
      className={`relative ${
        isPopular 
          ? 'border-primary' 
          : isCurrentPlan
          ? 'border-success'
          : 'border-border'
      }`}
    >
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
          <Badge variant="default" className="px-2 py-1 text-xs">
            Most Popular
          </Badge>
        </div>
      )}
      
      {/* Current Plan Badge */}
      {isCurrentPlan && (
        <div className="absolute top-3 right-3 z-10">
          <Badge variant="secondary" className="text-xs">
            Current Plan
          </Badge>
        </div>
      )}

      <CardHeader className="text-center space-y-4 pb-6">
        {/* Plan Title */}
        <div className="space-y-1">
          <CardTitle className="text-xl font-semibold">{plan.display_name}</CardTitle>
        </div>
        
        {/* Pricing */}
        <div className="space-y-2">
          <div className="text-3xl font-bold text-foreground">
            {formatCurrency(plan.price)}
            <span className="text-base text-muted-foreground font-normal">/month</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Features List */}
        <div className="space-y-3">
          {UNIFIED_SUBSCRIPTION_FEATURES.map((feature, index) => (
            <div key={index} className="flex items-start space-x-3">
              <Tick01Icon className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
              <span className="text-sm leading-relaxed">{feature}</span>
            </div>
          ))}
        </div>
        
        <Separator />
        
        {/* Action Button */}
        <div className="pt-4">
          {isCurrentPlan ? (
            <Button 
              variant="outline" 
              className="w-full h-10 bg-success/10 text-success border-success/50 cursor-default" 
              disabled
            >
              <CheckmarkCircle01Icon className="h-4 w-4 mr-2" />
              Current Plan
            </Button>
          ) : !showUpgradeButton ? (
            <Button 
              variant="outline" 
              className="w-full h-10 opacity-50 cursor-not-allowed" 
              disabled
            >
              Available 1 day before expiry
            </Button>
          ) : (
            <Button 
              onClick={() => onSelectPlan(plan.plan_id)}
              disabled={processingPlan === plan.plan_id}
              className="w-full h-10"
              variant={isPopular ? 'default' : 'outline'}
            >
              {processingPlan === plan.plan_id ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCardIcon className="h-4 w-4 mr-2" />
                  Upgrade Plan
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};