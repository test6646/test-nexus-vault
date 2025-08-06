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
import { Calendar01Icon, DollarCircleIcon, UserIcon } from 'hugeicons-react';

interface SalaryHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: any;
}

const SalaryHistoryDialog = ({ open, onOpenChange, staff }: SalaryHistoryDialogProps) => {
  const { profile } = useAuth();
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
    if (!staff?.id || !profile?.current_firm_id) return;

    setLoading(true);
    try {
      if (staff.is_freelancer) {
        // Load freelancer payment history
        const { data, error } = await supabase
          .from('freelancer_payments')
          .select('*')
          .eq('freelancer_id', staff.id)
          .eq('firm_id', profile.current_firm_id)
          .order('payment_date', { ascending: false });

        if (error) throw error;
        setPayments(data || []);
      } else {
        // Load staff payment history
        const { data, error } = await supabase
          .from('staff_payments')
          .select('*')
          .eq('staff_id', staff.id)
          .eq('firm_id', profile.current_firm_id)
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
  }, [open, staff?.id, staff?.is_freelancer, profile?.current_firm_id]);

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'Cash':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'UPI':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Bank Transfer':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Card':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Cheque':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calendar01Icon className="h-5 w-5 mr-2" />
            Salary Payment History
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Staff Info */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {getInitials(staff?.full_name || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{staff?.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{staff?.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="text-2xl font-bold text-primary">₹{totalPaid.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Payment History Table */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <DollarCircleIcon className="h-5 w-5 mr-2" />
              {staff?.is_freelancer ? 'Freelancer Payment History' : 'Salary Payment History'} ({payments.length} payments)
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
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar01Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-semibold">
                            ₹{payment.amount.toLocaleString()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPaymentMethodColor(payment.payment_method)}>
                            {payment.payment_method}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground max-w-xs truncate">
                            {payment.description || 'No description'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-muted-foreground">
                            {new Date(payment.created_at).toLocaleDateString()} at{' '}
                            {new Date(payment.created_at).toLocaleTimeString()}
                          </p>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <DollarCircleIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Payment History</h3>
                <p className="text-muted-foreground">
                  No {staff?.is_freelancer ? 'freelancer payments' : 'salary payments'} have been made to this {staff?.is_freelancer ? 'freelancer' : 'staff member'} yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SalaryHistoryDialog;