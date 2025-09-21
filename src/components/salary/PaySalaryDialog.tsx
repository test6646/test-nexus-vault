import React, { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DollarCircleIcon, UserIcon, Calendar01Icon } from 'hugeicons-react';
import { PaymentMethod } from '@/types/studio';

interface PaySalaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: any;
  onSuccess: () => void;
}

const PaySalaryDialog = ({ open, onOpenChange, staff, onSuccess }: PaySalaryDialogProps) => {
  const { profile, currentFirmId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [assignmentTotal, setAssignmentTotal] = useState(0);
  const [taskTotal, setTaskTotal] = useState(0);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [description, setDescription] = useState('');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Load assignment total and task total when dialog opens
  React.useEffect(() => {
    if (!open || !staff?.id || !currentFirmId) return;
    // Reset form data when opening dialog
    setAmount('');
    setDescription('');
    setPaymentMethod('Cash');
    setAssignmentTotal(0);
    setTaskTotal(0);
    loadTotalAmounts();
  }, [open, staff?.id, currentFirmId]);

  const loadTotalAmounts = async () => {
    try {
      const isFreelancer = !!staff?.is_freelancer;
      
      // Optimized parallel data fetching
      const [
        { data: rates },
        { data: tasks },
        { data: payments }
      ] = await Promise.all([
        // 1) Get assignment rates
        supabase
          .from('event_assignment_rates')
          .select('rate, quantity')
          .match({
            firm_id: currentFirmId!,
            ...(isFreelancer ? { freelancer_id: staff.id } : { staff_id: staff.id })
          }),
        
        // 2) Get completed tasks with amounts
        supabase
          .from('tasks')
          .select('id, amount')
          .eq(isFreelancer ? 'freelancer_id' : 'assigned_to', staff.id)
          .eq('firm_id', currentFirmId!)
          .eq('status', 'Completed')
          .not('amount', 'is', null)
          .gt('amount', 0),
        
        // 3) Get all payments for this person
        isFreelancer 
          ? supabase
              .from('freelancer_payments')
              .select('amount, description')
              .eq('freelancer_id', staff.id)
              .eq('firm_id', currentFirmId!)
          : supabase
              .from('staff_payments')
              .select('amount, description')
              .eq('staff_id', staff.id)
              .eq('firm_id', currentFirmId!)
      ]);

      // Calculate assignment earnings
      const assignmentAmount = (rates || []).reduce((sum, rate) => {
        return sum + ((Number(rate.rate) || 0) * (Number(rate.quantity) || 0));
      }, 0);
      
      // Calculate unpaid task earnings
      const paidTaskIds = (payments || [])
        .filter(p => p.description?.includes('Task ID:'))
        .map(p => p.description?.match(/Task ID: ([a-f0-9-]+)/)?.[1])
        .filter(Boolean) as string[];

      const unpaidTasks = (tasks || []).filter(t => !paidTaskIds.includes(t.id));
      const taskAmount = unpaidTasks.reduce((sum, task) => sum + (Number(task.amount) || 0), 0);

      // Calculate already paid amounts
      const totalPaidFromAssignments = (payments || [])
        .filter(p => !p.description?.includes('Task ID:'))
        .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

      // Proper pending calculation
      const pendingAssignmentAmount = Math.max(0, assignmentAmount - totalPaidFromAssignments);
      const pendingTaskAmount = taskAmount; // Tasks are either paid or unpaid completely

      setAssignmentTotal(pendingAssignmentAmount);
      setTaskTotal(pendingTaskAmount);
      
      // Don't auto-populate amount - let admin manually input
      setAmount('');
    } catch (error) {
      console.error('Failed to load total amounts:', error);
    }
  };

  const handlePaySalary = async () => {
    const paymentAmount = parseFloat(amount);
    const totalPending = assignmentTotal + taskTotal;

    if (!amount || paymentAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (paymentAmount > totalPending) {
      toast({
        title: "Invalid amount",
        description: `Payment amount cannot exceed pending amount of ₹${totalPending.toLocaleString()}`,
        variant: "destructive",
      });
      return;
    }

    if (totalPending <= 0) {
      toast({
        title: "No pending amount",
        description: "This staff member has no pending payments",
        variant: "destructive",
      });
      return;
    }

    if (!currentFirmId) {
      toast({
        title: "Error",
        description: "No firm selected",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let paymentResult;
      
      if (staff.is_freelancer) {
        // Create freelancer payment record
        const { data, error: paymentError } = await supabase
          .from('freelancer_payments')
          .insert({
            firm_id: currentFirmId,
            freelancer_id: staff.id,
            amount: parseFloat(amount),
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: paymentMethod,
            description: description || `Payment to freelancer ${staff.full_name}`,
            created_by: profile.id,
          })
          .select()
          .single();

        if (paymentError) throw paymentError;
        paymentResult = data;
      } else {
        // Create staff payment record
        const { data, error: paymentError } = await supabase
          .from('staff_payments')
          .insert({
            firm_id: currentFirmId,
            staff_id: staff.id,
            amount: parseFloat(amount),
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: paymentMethod,
            description: description || `Salary payment to ${staff.full_name}`,
            created_by: profile.id,
          })
          .select()
          .single();

        if (paymentError) throw paymentError;
        paymentResult = data;
      }

      // Background processing for expense creation and sync
      const createExpenseAsync = async () => {
        try {
          const expenseDescription = staff.is_freelancer 
            ? `Freelancer payment to ${staff.full_name}`
            : `Salary payment to ${staff.full_name}`;

          const { data: expenseData, error: expenseError } = await supabase
            .from('expenses')
            .insert({
              firm_id: currentFirmId,
              category: 'Salary',
              description: expenseDescription,
              amount: parseFloat(amount),
              expense_date: new Date().toISOString().split('T')[0],
              payment_method: paymentMethod as any,
              notes: description || null,
              created_by: profile.id,
            })
            .select()
            .single();

          if (!expenseError && expenseData) {
            
            // Background sync to Google Sheets - parallel processing
            Promise.all([
              // Method 1: Direct sync
              import('@/services/googleSheetsSync').then(({ syncExpenseInBackground }) => 
                syncExpenseInBackground(expenseData.id, currentFirmId, 'create')
              ).catch(() => {}),
              
              // Method 2: Specialized function 
              paymentResult?.id ? supabase.functions.invoke('sync-salary-payments-to-google', {
                body: {
                  paymentType: staff.is_freelancer ? 'freelancer' : 'staff',
                  paymentId: paymentResult.id,
                  firmId: currentFirmId,
                  operation: 'create'
                }
              }).then(() => {})
                .catch(() => {}) : Promise.resolve()
            ]);
          } else {
            
          }
        } catch (error) {
          
        }
      };

      createExpenseAsync();

        // BACKGROUND SALARY NOTIFICATION - Fire and forget
        const sendSalaryNotification = async () => {
          try {
            const notificationResponse = await supabase.functions.invoke('send-staff-notification', {
              body: {
                staffName: staff.full_name,
                staffPhone: staff.mobile_number || staff.phone,
                amount: parseFloat(amount),
                paymentDate: new Date().toISOString().split('T')[0],
                paymentMethod: paymentMethod,
                firmId: currentFirmId,
                notificationType: 'salary_payment'
              }
            });

            if (notificationResponse.error) {
              console.error('Error sending salary payment notification:', notificationResponse.error);
            } else {
              console.log('✅ Salary payment notification sent successfully');
            }
          } catch (error) {
            console.error('Error sending salary payment notification:', error);
          }
        };

        // Fire and forget
        sendSalaryNotification();

      toast({
        title: "Payment successful",
        description: `₹${parseFloat(amount).toLocaleString()} paid to ${staff.full_name}`,
      });

      onSuccess();
      setAmount('');
      setDescription('');
      setPaymentMethod('Cash');
    } catch (error: any) {
      console.error('Error processing salary payment:', error);
      toast({
        title: "Payment failed",
        description: error.message || "Failed to process salary payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] md:max-w-[600px] max-h-[70vh] md:max-h-[90vh] overflow-y-auto mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <DollarCircleIcon className="h-5 w-5" />
            Pay Salary
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Badge variant="secondary" className="text-sm justify-center py-2">
                    Assignments: ₹{assignmentTotal.toLocaleString()}
                  </Badge>
                  <Badge variant="secondary" className="text-sm justify-center py-2">
                    Tasks: ₹{taskTotal.toLocaleString()}
                  </Badge>
                </div>
                <Badge variant="default" className="text-sm w-full justify-center py-2">
                  Total Pending: ₹{(assignmentTotal + taskTotal).toLocaleString()}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium">Payment Amount</Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  className="text-base h-10 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-14 text-sm font-semibold hover:bg-primary hover:text-primary-foreground"
                  onClick={() => handleQuickAmount((assignmentTotal + taskTotal) * 0.5)}
                  disabled={assignmentTotal + taskTotal <= 0}
                >
                  50%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-14 text-sm font-semibold hover:bg-primary hover:text-primary-foreground"
                  onClick={() => handleQuickAmount(assignmentTotal + taskTotal)}
                  disabled={assignmentTotal + taskTotal <= 0}
                >
                  100%
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="payment-method" className="text-sm font-medium">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Digital">Digital</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Notes (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add payment notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="min-h-[50px] resize-none text-sm"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 text-sm" disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handlePaySalary} disabled={loading || !amount} className="h-10 text-sm">
              {loading ? 'Processing...' : 'Pay Salary'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaySalaryDialog;
