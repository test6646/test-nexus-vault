import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CentralizedEvent } from '@/hooks/useCentralizedEvents';
import { PaymentMethod } from '@/types/studio';

interface CentralizedPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CentralizedEvent | null;
  onPayment: (eventId: string, paymentData: any) => Promise<any>;
}

const CentralizedPaymentDialog = ({ open, onOpenChange, event, onPayment }: CentralizedPaymentDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_method: 'Cash' as PaymentMethod,
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: ''
  });

  const handleSave = async () => {
    if (!event) return;

    setLoading(true);
    try {
      await onPayment(event.id, paymentData);
      onOpenChange(false);
      
      // Reset form
      setPaymentData({
        amount: 0,
        payment_method: 'Cash',
        payment_date: new Date().toISOString().split('T')[0],
        reference_number: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error recording payment:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!event) return null;

  const maxPayment = event.balance_amount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Event Summary */}
          <div className="bg-muted/50 rounded-lg p-3">
            <h4 className="font-semibold text-sm mb-2">{event.title}</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Total Amount:</span>
                <div className="font-medium">₹{event.total_amount.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Paid:</span>
                <div className="font-medium text-green-600">₹{event.total_paid.toLocaleString()}</div>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Remaining Balance:</span>
                <div className="font-bold text-red-600">₹{event.balance_amount.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={paymentData.amount}
                onChange={(e) => setPaymentData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                placeholder="Enter payment amount"
                max={maxPayment}
              />
              {maxPayment > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum: ₹{maxPayment.toLocaleString()}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select 
                value={paymentData.payment_method} 
                onValueChange={(value) => setPaymentData(prev => ({ ...prev, payment_method: value as PaymentMethod }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="payment_date">Payment Date</Label>
              <Input
                id="payment_date"
                type="date"
                value={paymentData.payment_date}
                onChange={(e) => setPaymentData(prev => ({ ...prev, payment_date: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="reference_number">Reference Number (Optional)</Label>
              <Input
                id="reference_number"
                value={paymentData.reference_number}
                onChange={(e) => setPaymentData(prev => ({ ...prev, reference_number: e.target.value }))}
                placeholder="Transaction ID, Cheque number, etc."
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={paymentData.notes}
                onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this payment"
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={loading || paymentData.amount <= 0 || paymentData.amount > maxPayment}
            >
              {loading ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CentralizedPaymentDialog;