
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
import { Event } from '@/types/studio';
import { PaymentMethod, DEFAULT_PAYMENT_METHOD, getPaymentMethodOptions, requiresReferenceNumber } from '@/lib/payment-method-validator';
import { calculateEventBalance, calculateTotalPaid, calculateTotalClosed } from '@/lib/payment-calculator';
import BalanceDisplay from '@/components/ui/balance-display';


interface PaymentCardProps {
  event: Event;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentCollected: () => void;
}

const PaymentCard = ({ event, open, onOpenChange, onPaymentCollected }: PaymentCardProps) => {
  const { profile, currentFirmId } = useAuth();
  const [collectingPayment, setCollectingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(DEFAULT_PAYMENT_METHOD);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [closingAmount, setClosingAmount] = useState<number>(0);
  const [closingReason, setClosingReason] = useState('');
  const [showClosingForm, setShowClosingForm] = useState(false);
  const [processingClosing, setProcessingClosing] = useState(false);
  const { toast } = useToast();

  // Calculate actual balance using the payment calculator
  const eventWithClosingBalances = {
    ...event,
    event_closing_balances: (event as any).event_closing_balances || []
  };
  const totalPaid = calculateTotalPaid(eventWithClosingBalances);
  const totalClosed = calculateTotalClosed(eventWithClosingBalances);
  const balanceAmount = calculateEventBalance(eventWithClosingBalances);

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
      
      // 1. Generate invoice ID first
      
      const { data: invoiceIdData, error: invoiceError } = await supabase
        .rpc('generate_invoice_id', { p_event_id: event.id });
      
      if (invoiceError) {
        
        throw new Error('Failed to generate invoice ID');
      }

      // 2. IMMEDIATE DATABASE UPDATE - This should be fast
      const { data: paymentData, error } = await supabase
        .from('payments')
        .insert({
          event_id: event.id,
          firm_id: currentFirmId,
          amount: paymentAmount,
          payment_method: paymentMethod as any,
          payment_date: new Date().toISOString().split('T')[0],
          reference_number: referenceNumber.trim() || null,
          invoice_id: invoiceIdData,
          created_by: profile?.id
        })
        .select()
        .single();

      if (error) throw error;
      
      
      // 2. IMMEDIATE UI UPDATE - Don't wait for background processes
      toast({
        title: "Payment collected successfully!",
        description: `₹${paymentAmount.toLocaleString()} has been recorded for ${event.title}`,
      });

      setPaymentAmount(0);
      setReferenceNumber('');
      
      // Close dialog first, then trigger refresh
      onOpenChange(false);
      
      // Small delay to ensure dialog closes before refresh
      setTimeout(() => {
        onPaymentCollected(); // This updates the parent component
      }, 100);

      // 3. BACKGROUND PROCESSES - Run without blocking UI
      
      // Background payment notification - Fire and forget
      

      if (event.client?.phone) {
        supabase.functions.invoke('send-payment-notification', {
          body: {
            clientName: event.client?.name || 'Valued Client',
            clientPhone: event.client.phone,
            eventName: event.title,
            amountPaid: paymentAmount,
            paymentMethod,
            remainingBalance: Math.max(0, (event.total_amount || 0) - totalPaid - paymentAmount),
            firmId: event.firm_id
          }
        }).then((result) => {
          if (result.error) {
            
          } else {
            
          }
        }).catch(error => {
          
        });
      } else {
        
      }
      
      // FIXED: Use sync coordinator to prevent cascade loops
      if (currentFirmId && paymentData) {
        import('@/services/syncCoordinator').then(({ syncPayment, syncEvent }) => {
          // Sync payment to Payment sheet (no cascade to events)
          syncPayment(paymentData.id, currentFirmId, 'create');
          // Sync event separately to update amounts (controlled, no cascade back)
          syncEvent(event.id, currentFirmId, 'update', 'payment-collection');
        }).catch(syncError => {
          console.error('Background sync error:', syncError);
        });
      }

    } catch (error: any) {
      
      toast({
        title: "Error collecting payment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCollectingPayment(false);
    }
  };

  const closeBalance = async () => {
    if (closingAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Closing amount must be greater than ₹0",
        variant: "destructive",
      });
      return;
    }

    // Determine if we're in edit mode (when pending is 0) or normal mode (when pending > 0)
    const isEditMode = balanceAmount === 0;
    
    if (!isEditMode) {
      // NORMAL MODE: Adding to existing closed amount
      if (closingAmount > balanceAmount) {
        toast({
          title: "Invalid closing amount",
          description: `Closing amount (₹${closingAmount.toLocaleString()}) cannot exceed remaining balance (₹${balanceAmount.toLocaleString()})`,
          variant: "destructive",
        });
        return;
      }

      // Check if closing this amount would make total bill 0 when advance payments exist
      const totalAmountAfterClosing = (event.total_amount || 0) - totalClosed - closingAmount;
      if (totalAmountAfterClosing === 0 && totalPaid > 0) {
        toast({
          title: "Cannot close balance",
          description: `You cannot make the total bill ₹0 when advance payment of ₹${totalPaid.toLocaleString()} exists. Consider adjusting the closing amount.`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setProcessingClosing(true);

      // Check if there's already a closing balance for this event
      const { data: existingClosing } = await supabase
        .from('event_closing_balances')
        .select('id, closing_amount')
        .eq('event_id', event.id)
        .maybeSingle();

      let error;
      let finalClosingAmount;

      if (isEditMode) {
        // EDIT MODE: Replace/overwrite the total closing amount
        finalClosingAmount = closingAmount;
      } else {
        // NORMAL MODE: Add to existing closing amount
        finalClosingAmount = (existingClosing?.closing_amount || 0) + closingAmount;
      }

      if (existingClosing) {
        // Update existing closing balance
        ({ error } = await supabase
          .from('event_closing_balances')
          .update({
            total_bill: event.total_amount || 0,
            collected_amount: totalPaid,
            closing_amount: finalClosingAmount,
            closing_reason: closingReason.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingClosing.id));
      } else {
        // Insert new closing balance (only happens in normal mode)
        ({ error } = await supabase
          .from('event_closing_balances')
          .insert({
            event_id: event.id,
            firm_id: currentFirmId,
            total_bill: event.total_amount || 0,
            collected_amount: totalPaid,
            closing_amount: finalClosingAmount,
            closing_reason: closingReason.trim() || null,
            created_by: profile?.id
          }));
      }

      if (error) throw error;

      toast({
        title: "Balance closed successfully!",
        description: `₹${closingAmount.toLocaleString()} has been marked as closed for ${event.title}`,
      });

      setClosingAmount(0);
      setClosingReason('');
      setShowClosingForm(false);
      onOpenChange(false);
      
      setTimeout(() => {
        onPaymentCollected();
      }, 100);

      // FIXED: Use sync coordinator for balance closing
      if (currentFirmId && event.id) {
        import('@/services/syncCoordinator').then(({ syncEvent }) => {
          syncEvent(event.id, currentFirmId, 'update', 'balance-closing');
        }).catch(syncError => {
          console.error('Background sync error:', syncError);
        });
      }

    } catch (error: any) {
      
      toast({
        title: "Error closing balance",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingClosing(false);
    }
  };

  const setFullBalance = () => {
    setPaymentAmount(balanceAmount);
  };

  const setHalfBalance = () => {
    setPaymentAmount(Math.round(balanceAmount / 2));
  };

  const setFullClosing = () => {
    setClosingAmount(balanceAmount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[calc(100vh-6rem)] overflow-y-auto">
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
            <div className="text-2xl font-bold text-warning">
              <BalanceDisplay event={eventWithClosingBalances} showIcon={true} size="lg" />
            </div>
            <p className="text-sm text-muted-foreground">Balance Amount</p>
            {totalClosed > 0 && (
              <p className="text-xs text-muted-foreground">
                (₹{totalClosed.toLocaleString()} closed)
              </p>
            )}
          </div>

          {/* Payment Collection Section */}
          {balanceAmount > 0 && !showClosingForm && (
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
                        {getPaymentMethodOptions().map(({ value, label }) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {requiresReferenceNumber(paymentMethod) && (
                  <div className="space-y-2">
                    <Label htmlFor="referenceNumber">Reference Number</Label>
                    <Input
                      id="referenceNumber"
                      placeholder="Transaction ID, UPI Ref#, etc."
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={collectPayment} 
                    disabled={collectingPayment || paymentAmount <= 0}
                    className="flex-1"
                  >
                    {collectingPayment ? 'Processing...' : `Collect ₹${paymentAmount.toLocaleString()}`}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowClosingForm(true)}
                    disabled={collectingPayment}
                  >
                    Close Balance
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Closing Balance Section */}
          {balanceAmount > 0 && showClosingForm && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Money02Icon className="h-5 w-5" />
                  Close Balance
                </CardTitle>
                <CardDescription>
                  Mark remaining amount as closed (not collectible)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="closingAmount">Closing Amount (₹)</Label>
                    <Input
                      id="closingAmount"
                      type="number"
                      placeholder="Enter amount to close"
                      value={closingAmount || ''}
                      onChange={(e) => setClosingAmount(parseFloat(e.target.value) || 0)}
                      max={balanceAmount}
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={setFullClosing}
                      className="w-full"
                    >
                      Close Full Balance (₹{balanceAmount.toLocaleString()})
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="closingReason">Reason (Optional)</Label>
                    <Input
                      id="closingReason"
                      placeholder="e.g., Family discount, settlement agreement"
                      value={closingReason}
                      onChange={(e) => setClosingReason(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={closeBalance} 
                    disabled={processingClosing || closingAmount <= 0}
                    className="flex-1"
                    variant="destructive"
                  >
                    {processingClosing ? 'Processing...' : `Close ₹${closingAmount.toLocaleString()}`}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowClosingForm(false)}
                    disabled={processingClosing}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {balanceAmount === 0 && !showClosingForm && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                  <Money02Icon className="h-8 w-8 text-success" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-success">Payment Complete</h3>
                <p className="text-muted-foreground text-center mb-4">
                  All payments have been collected for this event.
                </p>
                <Button 
                  variant="outline"
                  onClick={() => setShowClosingForm(true)}
                  size="sm"
                >
                  Edit Closed Balance
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Allow editing closed balance even when pending is 0 */}
          {balanceAmount === 0 && showClosingForm && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Money02Icon className="h-5 w-5" />
                  Edit Closed Balance
                </CardTitle>
                <CardDescription>
                  Adjust closed balance amount and reason
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="closingAmountEdit">New Closing Amount (₹)</Label>
                    <Input
                      id="closingAmountEdit"
                      type="number"
                      placeholder="Enter new closing amount"
                      value={closingAmount || ''}
                      onChange={(e) => setClosingAmount(parseFloat(e.target.value) || 0)}
                      min={0}
                    />
                    {totalClosed > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Current closed amount: ₹{totalClosed.toLocaleString()}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="closingReasonEdit">Reason</Label>
                    <Input
                      id="closingReasonEdit"
                      placeholder="e.g., Correction to previous closure"
                      value={closingReason}
                      onChange={(e) => setClosingReason(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={closeBalance} 
                    disabled={processingClosing || closingAmount <= 0}
                    className="flex-1"
                    variant="default"
                  >
                    {processingClosing ? 'Processing...' : `Update Closed Balance`}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowClosingForm(false)}
                    disabled={processingClosing}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentCard;
