import { useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useSubscriptionPayments = (firmId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const createRazorpayOrder = useCallback(async (planId: string) => {
    if (!user || !firmId) {
      throw new Error('User or firm not available');
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: { planType: planId, firmId },
      });

      if (error) {
        throw new Error(error.message || 'Failed to create order');
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  }, [user, firmId, toast]);

  const verifyPayment = useCallback(async (
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ) => {
    if (!user) {
      throw new Error('User not available');
    }

    try {
      const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
        body: {
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
        },
      });

      if (error) {
        throw new Error(error.message || 'Payment verification failed');
      }

      toast({
        title: "Payment Successful!",
        description: "Your subscription has been activated.",
        variant: "default",
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment verification failed';
      toast({
        title: "Payment Verification Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  }, [user, toast]);

  return {
    createRazorpayOrder,
    verifyPayment,
  };
};