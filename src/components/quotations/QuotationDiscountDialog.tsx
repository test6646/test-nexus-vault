import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Quotation } from '@/types/studio';
import { supabase } from '@/integrations/supabase/client';

interface QuotationDiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: Quotation;
  onDiscountApplied: () => void;
}

export interface DiscountData {
  type: 'percentage' | 'fixed';
  value: number;
  reason?: string;
}

const QuotationDiscountDialog = ({ 
  open, 
  onOpenChange, 
  quotation, 
  onDiscountApplied 
}: QuotationDiscountDialogProps) => {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (quotation.discount_type && quotation.discount_value) {
      setDiscountType(quotation.discount_type as 'percentage' | 'fixed');
      setDiscountValue(quotation.discount_value.toString());
      setReason(''); // Don't store reason in database for now
    } else {
      setDiscountType('percentage');
      setDiscountValue('');
      setReason('');
    }
  }, [quotation]);

  const calculateDiscountedAmount = () => {
    const originalAmount = quotation.amount || 0;
    const discount = parseFloat(discountValue) || 0;
    
    if (discountType === 'percentage') {
      return originalAmount - (originalAmount * discount / 100);
    } else {
      return originalAmount - discount;
    }
  };

  const handleApplyDiscount = async () => {
    if (!discountValue || parseFloat(discountValue) <= 0) {
      toast({
        title: "Invalid discount",
        description: "Please enter a valid discount value",
        variant: "destructive",
      });
      return;
    }

    const discountAmount = parseFloat(discountValue);
    const originalAmount = quotation.amount || 0;

    if (discountType === 'percentage' && discountAmount >= 100) {
      toast({
        title: "Invalid percentage",
        description: "Discount percentage cannot be 100% or more",
        variant: "destructive",
      });
      return;
    }

    if (discountType === 'fixed' && discountAmount >= originalAmount) {
      toast({
        title: "Invalid discount",
        description: "Fixed discount cannot be equal to or greater than total amount",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const calculatedDiscountAmount = discountType === 'percentage' 
        ? originalAmount * discountAmount / 100 
        : discountAmount;

      const { error } = await supabase
        .from('quotations')
        .update({
          discount_type: discountType,
          discount_value: discountAmount,
          discount_amount: calculatedDiscountAmount
        })
        .eq('id', quotation.id);

      if (error) throw error;

      onDiscountApplied();
      
      toast({
        title: "Discount applied!",
        description: `${discountType === 'percentage' ? discountAmount + '%' : '₹' + discountAmount.toLocaleString('en-IN')} discount applied successfully`,
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error applying discount",
        description: "Failed to apply discount. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDiscount = async () => {
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('quotations')
        .update({
          discount_type: null,
          discount_value: null,
          discount_amount: null
        })
        .eq('id', quotation.id);

      if (error) throw error;

      onDiscountApplied();
      
      toast({
        title: "Discount removed!",
        description: "Discount has been removed successfully",
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error removing discount",
        description: "Failed to remove discount. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const discountedAmount = calculateDiscountedAmount();
  const originalAmount = quotation.amount || 0;
  const hasExistingDiscount = quotation.discount_type && quotation.discount_value;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[calc(100vh-6rem)]">
        <DialogHeader>
          <DialogTitle>{hasExistingDiscount ? 'Manage Discount' : 'Apply Discount'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {hasExistingDiscount && (
            <div className="bg-muted p-3 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-2">Current Discount:</div>
              <div className="space-y-1">
                <div className="text-sm">
                  {quotation.discount_type === 'percentage' ? `${quotation.discount_value}%` : `₹${quotation.discount_value?.toLocaleString('en-IN')}`} discount applied
                </div>
                <div className="flex flex-col gap-1 text-sm">
                  <div className="line-through text-muted-foreground">
                    Original: ₹{originalAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-green-600 font-medium">
                    Current: ₹{(originalAmount - (quotation.discount_amount || 0)).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="discount-type">Discount Type</Label>
              <Select value={discountType} onValueChange={(value: 'percentage' | 'fixed') => setDiscountType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="discount-value">
                {discountType === 'percentage' ? 'Percentage' : 'Amount'}
              </Label>
              <Input
                id="discount-value"
                type="number"
                placeholder={discountType === 'percentage' ? '10' : '1000'}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                min="0"
                max={discountType === 'percentage' ? '99' : originalAmount.toString()}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Input
              id="reason"
              placeholder="e.g., Early bird discount, Bulk booking"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {discountValue && parseFloat(discountValue) > 0 && (
            <div className="bg-muted p-3 rounded-lg">
              <div className="text-sm text-muted-foreground">Preview:</div>
              <div className="flex flex-col gap-1 text-sm">
                <div className="line-through text-muted-foreground">
                  ₹{originalAmount.toLocaleString('en-IN')}
                </div>
                <div className="text-green-600 font-medium">
                  ₹{discountedAmount.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                You save: ₹{(originalAmount - discountedAmount).toLocaleString('en-IN')}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            {hasExistingDiscount && (
              <Button 
                variant="destructive"
                onClick={handleRemoveDiscount}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Removing...' : 'Remove'}
              </Button>
            )}
            <Button 
              onClick={handleApplyDiscount}
              disabled={loading || !discountValue || parseFloat(discountValue) <= 0}
              className="flex-1"
            >
              {loading ? 'Applying...' : hasExistingDiscount ? 'Update' : 'Apply'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuotationDiscountDialog;