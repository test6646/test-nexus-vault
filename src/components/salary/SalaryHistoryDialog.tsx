import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Calendar01Icon, DollarCircleIcon, UserIcon } from 'hugeicons-react';

interface SalaryHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: any;
}

const SalaryHistoryDialog = ({ open, onOpenChange, staff }: SalaryHistoryDialogProps) => {
  const { profile, currentFirmId } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const loadPaymentHistory = async () => {
    if (!staff?.id || !currentFirmId) return;

    setLoading(true);
    try {
      if (staff.is_freelancer) {
        // Load freelancer payment history
        const { data, error } = await supabase
          .from('freelancer_payments')
          .select('*')
          .eq('freelancer_id', staff.id)
          .eq('firm_id', currentFirmId)
          .order('payment_date', { ascending: false });

        if (error) throw error;
        setPayments(data || []);
      } else {
        // Load staff payment history
        const { data, error } = await supabase
          .from('staff_payments')
          .select('*')
          .eq('staff_id', staff.id)
          .eq('firm_id', currentFirmId)
          .order('payment_date', { ascending: false });

        if (error) throw error;
        setPayments(data || []);
      }
    } catch (error) {
      console.error('Error loading payment history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadPaymentHistory();
    }
  }, [open, staff?.id, staff?.is_freelancer, currentFirmId]);

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'Cash':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Digital':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] md:max-w-[600px] max-h-[70vh] md:max-h-[90vh] flex flex-col mx-auto">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Calendar01Icon className="h-5 w-5" />
            Payment History
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {/* Staff Info */}
          <Card className="bg-muted/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                    {getInitials(staff?.full_name || '')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{staff?.full_name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{staff?.role}</p>
                </div>
              </div>
              <div className="mt-3 text-center">
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="text-xl font-bold text-primary">₹{totalPaid.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <DollarCircleIcon className="h-4 w-4" />
              <span className="break-words">
                {staff?.is_freelancer ? 'Freelancer Payments' : 'Salary Payments'} ({payments.length})
              </span>
            </h3>

            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-3 border rounded">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : payments.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {payments.map((payment) => (
                  <Card key={payment.id} className="border">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar01Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium text-sm">
                              {new Date(payment.payment_date).toLocaleDateString()}
                            </span>
                          </div>
                          <Badge className={`${getPaymentMethodColor(payment.payment_method)} text-xs mb-1`}>
                            {payment.payment_method}
                          </Badge>
                          {payment.description && (
                            <p className="text-xs text-muted-foreground break-words mt-1">
                              {payment.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(payment.created_at).toLocaleDateString()} at{' '}
                            {new Date(payment.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right ml-2">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-semibold text-sm">
                            ₹{payment.amount.toLocaleString()}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <DollarCircleIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-base font-semibold mb-2">No Payment History</h3>
                <p className="text-sm text-muted-foreground">
                  No {staff?.is_freelancer ? 'freelancer payments' : 'salary payments'} have been made yet.
                </p>
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="pt-3 border-t flex-shrink-0">
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="h-10 text-sm"
              >
                Close
              </Button>
              <Button 
                onClick={() => onOpenChange(false)}
                className="h-10 text-sm"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SalaryHistoryDialog;