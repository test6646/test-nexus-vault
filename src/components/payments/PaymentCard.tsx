
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCardIcon, 
  Money02Icon
} from 'hugeicons-react';
import { Event, PaymentMethod } from '@/types/studio';

interface PaymentCardProps {
  event: Event;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentCollected: () => void;
}

const PaymentCard = ({ event, open, onOpenChange, onPaymentCollected }: PaymentCardProps) => {
  const { profile } = useAuth();
  const [collectingPayment, setCollectingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [referenceNumber, setReferenceNumber] = useState('');
  const { toast } = useToast();

  // Calculate actual balance based on all payments made so far
  const totalPaid = event.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || event.advance_amount || 0;
  const balanceAmount = Math.max(0, (event.total_amount || 0) - totalPaid);
  const paymentMethods: PaymentMethod[] = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque'];

  const collectPayment = async () => {
    // Strict validation: Amount must be positive and not exceed balance
    if (paymentAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Payment amount must be greater than ₹0",
        variant: "destructive",
      });
      return;
    }

    if (paymentAmount > balanceAmount) {
      toast({
        title: "Payment exceeds balance",
        description: `Payment amount (₹${paymentAmount.toLocaleString()}) cannot exceed remaining balance (₹${balanceAmount.toLocaleString()})`,
        variant: "destructive",
      });
      return;
    }

    // Additional check: Ensure payment doesn't exceed total event amount
    const totalPaidAfterThisPayment = totalPaid + paymentAmount;
    if (totalPaidAfterThisPayment > (event.total_amount || 0)) {
      toast({
        title: "Payment exceeds total amount",
        description: `Total payments (₹${totalPaidAfterThisPayment.toLocaleString()}) cannot exceed event total (₹${(event.total_amount || 0).toLocaleString()})`,
        variant: "destructive",
      });
      return;
    }

    try {
      setCollectingPayment(true);
      
      // 1. IMMEDIATE DATABASE UPDATE - This should be fast
      console.log('💰 Starting payment collection...');
      const { data: paymentData, error } = await supabase
        .from('payments')
        .insert({
          event_id: event.id,
          firm_id: profile?.current_firm_id,
          amount: paymentAmount,
          payment_method: paymentMethod,
          payment_date: new Date().toISOString().split('T')[0],
          reference_number: referenceNumber.trim() || null,
          created_by: profile?.id
        })
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Payment inserted to database successfully');

      // 2. IMMEDIATE UI UPDATE - Don't wait for background processes
      toast({
        title: "Payment collected successfully!",
        description: `₹${paymentAmount.toLocaleString()} has been recorded for ${event.title}`,
      });

      setPaymentAmount(0);
      setReferenceNumber('');
      onPaymentCollected(); // This updates the parent component immediately
      onOpenChange(false);

      // 3. BACKGROUND PROCESSES - Run without blocking UI
      console.log('🔄 Starting background processes...');
      
      // Google Sheets sync (non-blocking)
      if (profile?.current_firm_id) {
        supabase.functions.invoke('sync-payment-to-google', {
          body: {
            paymentId: paymentData.id,
            firmId: profile.current_firm_id
          }
        }).then(({ data: syncData, error: syncError }) => {
          if (syncError) {
            console.warn('⚠️ Payment sync to Google Sheets failed:', syncError);
          } else {
            console.log('✅ Payment synced to Google Sheets successfully');
          }
        }).catch(syncError => {
          console.warn('⚠️ Payment sync to Google Sheets failed:', syncError);
        });
      }

      

    } catch (error: any) {
      console.error('❌ Error collecting payment:', error);
      toast({
        title: "Error collecting payment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCollectingPayment(false);
    }
  };

  const setFullBalance = () => {
    setPaymentAmount(balanceAmount);
  };

  const setHalfBalance = () => {
    setPaymentAmount(Math.round(balanceAmount / 2));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5" />
            Payment Collection
          </DialogTitle>
          <DialogDescription>
            Collect payment for {event.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Balance Summary */}
          <div className="text-center space-y-1">
            <h3 className="text-lg font-semibold">{event.title}</h3>
            <p className="text-2xl font-bold text-warning">₹{balanceAmount.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Balance Amount</p>
          </div>

          {/* Payment Collection Section */}
          {balanceAmount > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Money02Icon className="h-5 w-5" />
                  Collect Payment
                </CardTitle>
                <CardDescription>
                  Record a payment received from the client
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentAmount">Payment Amount (₹)</Label>
                    <Input
                      id="paymentAmount"
                      type="number"
                      placeholder="Enter amount"
                      value={paymentAmount || ''}
                      onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                      max={balanceAmount}
                    />
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={setHalfBalance}
                      >
                        Half (₹{Math.round(balanceAmount / 2).toLocaleString()})
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={setFullBalance}
                      >
                        Full (₹{balanceAmount.toLocaleString()})
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referenceNumber">Reference Number (Optional)</Label>
                  <Input
                    id="referenceNumber"
                    placeholder="Transaction ID, Cheque number, etc."
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={collectPayment} 
                  disabled={collectingPayment || paymentAmount <= 0}
                  className="w-full"
                >
                  {collectingPayment ? 'Processing...' : `Collect ₹${paymentAmount.toLocaleString()}`}
                </Button>
              </CardContent>
            </Card>
          )}

          {balanceAmount === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                  <Money02Icon className="h-8 w-8 text-success" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-success">Payment Complete</h3>
                <p className="text-muted-foreground text-center">
                  All payments have been collected for this event.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentCard;
