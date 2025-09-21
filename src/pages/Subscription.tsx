import React, { useState, useEffect } from 'react';
import TopNavbar from '@/components/layout/TopNavbar';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { useSubscriptionPayments } from '@/hooks/useSubscriptionPayments';
import { PlanUpgradeDialog } from '@/components/subscription/PlanUpgradeDialog';
import { SubscriptionPlanCard } from '@/components/subscription/SubscriptionPlanCard';
import { PaymentHistorySection } from '@/components/subscription/PaymentHistorySection';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Calendar01Icon, Shield01Icon, CreditCardIcon } from 'hugeicons-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Subscription = () => {
  const { user, currentFirmId, currentFirm } = useAuth();
  const { 
    subscription, 
    loading, 
    checkSubscription,
    isTrialExpiring,
    isSubscriptionExpiring,
    daysUntilExpiry
  } = useSubscriptionStatus(currentFirmId || undefined);
  const { createRazorpayOrder, verifyPayment } = useSubscriptionPayments(currentFirmId || undefined);
  const { plans, loading: plansLoading } = useSubscriptionPlans();
  const { toast } = useToast();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [upgradeDialog, setUpgradeDialog] = useState<{
    open: boolean;
    targetPlan: any;
    remainingDays: number;
    extendedDays: number;
  }>({
    open: false,
    targetPlan: null,
    remainingDays: 0,
    extendedDays: 0
  });

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to load payment gateway. Please refresh the page.",
        variant: "destructive",
      });
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [toast]);

  const calculateRemainingDays = () => {
    if (!subscription?.subscriptionEndAt) return 0;
    const now = new Date();
    const endDate = new Date(subscription.subscriptionEndAt);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const calculateExtendedDays = (remainingDays: number, newPlanMonths: number, currentPlanMonths: number = 1) => {
    if (remainingDays === 0) return 0;
    // Calculate the proportional extension based on plan upgrade
    const monthRatio = newPlanMonths / currentPlanMonths;
    return Math.floor(remainingDays * monthRatio);
  };

  const handlePlanSelect = async (planId: string) => {
    const targetPlan = plans.find(p => p.plan_id === planId);
    if (!targetPlan) return;

    const currentPlan = plans.find(p => p.plan_id === subscription?.planType);
    const remainingDays = calculateRemainingDays();
    const extendedDays = calculateExtendedDays(
      remainingDays, 
      targetPlan.duration_months,
      currentPlan?.duration_months
    );

    setUpgradeDialog({
      open: true,
      targetPlan,
      remainingDays,
      extendedDays
    });
  };

  const handleUpgrade = async (planId: string) => {
    if (!razorpayLoaded) {
      toast({
        title: "Error",
        description: "Payment gateway is loading. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    if (!currentFirmId || !user) {
      toast({
        title: "Error",
        description: "Please select a firm first.",
        variant: "destructive",
      });
      return;
    }

    setProcessingPlan(planId);

    try {
      // Create Razorpay order
      const orderData = await createRazorpayOrder(planId);
      
      const targetPlan = plans.find(p => p.plan_id === planId);
      
      const options = {
        key: orderData.keyId, // Razorpay key ID from backend
        amount: orderData.amount,
        currency: orderData.currency,
        name: currentFirm?.name || 'Studio Management',
        description: targetPlan?.display_name || `Subscription`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            await verifyPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );
            // Payment successful - refresh subscription status
            await checkSubscription();
            setProcessingPlan(null);
            setUpgradeDialog(prev => ({ ...prev, open: false }));
            toast({
              title: "Payment Successful!",
              description: "Your subscription has been activated.",
              variant: "default",
            });
          } catch (error) {
            console.error('Payment verification failed:', error);
            setProcessingPlan(null);
            toast({
              title: "Payment Failed",
              description: "There was an issue processing your payment. Please try again.",
              variant: "destructive",
            });
          }
        },
        prefill: {
          email: user.email,
        },
        theme: {
          color: '#c4b28d',
        },
        modal: {
          ondismiss: () => {
            setProcessingPlan(null);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Error creating order:', error);
      setProcessingPlan(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

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

  if (loading || plansLoading) {
    return (
      <TopNavbar>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Loading subscription details...</span>
          </div>
        </div>
      </TopNavbar>
    );
  }

  const currentPlan = plans.find(p => p.plan_id === subscription?.planType);
  
  // Calculate if user can upgrade (only 1 day before expiration)
  const canUpgrade = () => {
    if (!subscription || subscription.status === 'trial') return true;
    if (subscription.status === 'expired') return true;
    
    return daysUntilExpiry !== null && daysUntilExpiry <= 1;
  };

  return (
    <TopNavbar>
      <div className="max-w-7xl mx-auto space-y-8 py-8 px-4">
        {/* Simple Header Section */}
        <div className="text-center space-y-4 mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            {getStatusBadge()}
            <CreditCardIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Subscription Management
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Choose your plan and manage your subscription
          </p>
        </div>

        {/* Current Subscription Status */}
        {subscription && (
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <Shield01Icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-lg">Current Subscription Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center space-y-3">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Status</p>
                  <div className="flex items-center justify-center">
                    {getStatusBadge()}
                  </div>
                </div>
                
                {subscription.status === 'active' && currentPlan && (
                  <div className="text-center space-y-3">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Current Plan</p>
                    <p className="text-xl font-bold text-primary">
                      {currentPlan.display_name}
                    </p>
                  </div>
                )}
                
                {(subscription.trialEndAt || subscription.subscriptionEndAt) && (
                  <div className="text-center space-y-3">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      {subscription.status === 'trial' ? 'Trial Ends' : 'Renews On'}
                    </p>
                    <div className="flex items-center justify-center space-x-2">
                      <Calendar01Icon className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">
                        {subscription.status === 'trial' && subscription.trialEndAt
                          ? formatDate(subscription.trialEndAt)
                          : subscription.subscriptionEndAt 
                          ? formatDate(subscription.subscriptionEndAt)
                          : ''
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing Plans */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => {
              const isCurrentPlan = subscription?.planType === plan.plan_id;
              const isPopular = plan.plan_id === 'yearly';
              const monthlyPrice = Math.round(plan.price / plan.duration_months);
              const monthlyPlan = plans.find(p => p.duration_months === 1);
              const savings = monthlyPlan && plan.duration_months > 1 
                ? (monthlyPlan.price * plan.duration_months) - plan.price 
                : 0;
              
              return (
                <SubscriptionPlanCard
                  key={plan.id}
                  plan={plan}
                  isCurrentPlan={isCurrentPlan}
                  isPopular={isPopular}
                  monthlyPrice={monthlyPrice}
                  savings={savings}
                  processingPlan={processingPlan}
                  onSelectPlan={handlePlanSelect}
                  showUpgradeButton={canUpgrade()}
                />
              );
            })}
          </div>
        </div>

        {/* Payment History */}
        {currentFirmId && (
          <PaymentHistorySection firmId={currentFirmId} />
        )}

        {/* Plan Upgrade Dialog */}
        <PlanUpgradeDialog
          open={upgradeDialog.open}
          onOpenChange={(open) => setUpgradeDialog(prev => ({ ...prev, open }))}
          currentPlan={currentPlan || null}
          targetPlan={upgradeDialog.targetPlan}
          remainingDays={upgradeDialog.remainingDays}
          extendedDays={upgradeDialog.extendedDays}
          onConfirm={() => handleUpgrade(upgradeDialog.targetPlan?.plan_id)}
          onCancel={() => setUpgradeDialog(prev => ({ ...prev, open: false }))}
          loading={!!processingPlan}
        />
      </div>
    </TopNavbar>
  );
};

export default Subscription;