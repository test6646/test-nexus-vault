import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download01Icon, ViewIcon, Search01Icon, CreditCardIcon, CheckmarkCircle01Icon, Loading03Icon } from 'hugeicons-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { PaymentDetailsDialog } from './PaymentDetailsDialog';
import { generateUnifiedSubscriptionInvoicePDF } from './UnifiedSubscriptionInvoicePDF';

interface PaymentHistoryProps {
  firmId: string;
}

interface Payment {
  id: string;
  plan_type: string;
  amount: number;
  currency: string;
  paid_at: string;
  period_months: number;
  status: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature?: string;
}

export const PaymentHistorySection: React.FC<PaymentHistoryProps> = ({ firmId }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPaymentHistory();
  }, [firmId]);

  const fetchPaymentHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('firm_payments')
        .select('*')
        .eq('firm_id', firmId)
        .eq('status', 'paid')
        .order('paid_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payment history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = async (payment: Payment) => {
    setDownloadingInvoice(payment.id);
    try {
      console.log('Starting invoice download for payment:', payment.id);
      
      const { data, error } = await supabase.functions.invoke('download-invoice', {
        body: { firmId, paymentId: payment.id }
      });

      console.log('Download invoice response:', { data, error });

      if (error) {
        console.error('Download invoice function error:', error);
        throw new Error(error.message || 'Failed to download invoice from server');
      }

      if (!data) {
        throw new Error('No data returned from invoice service');
      }

      // Generate PDF with the received invoice data
      console.log('Generating PDF with data:', data);
      await generateUnifiedSubscriptionInvoicePDF(data);

      toast({
        title: "Success",
        description: "Invoice downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading invoice:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error", 
        description: `Failed to download invoice: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const viewPaymentDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowPaymentDetails(true);
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-success/20 text-success border-success/50 flex items-center gap-1">
            <CheckmarkCircle01Icon className="h-3 w-3" />
            Success
          </Badge>
        );
      case 'processing':
        return <Badge className="bg-primary/20 text-primary border-primary/50">Processing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredPayments = payments.filter(payment =>
    payment.plan_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.razorpay_payment_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
            <span className="text-muted-foreground">Loading payment history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCardIcon className="h-5 w-5 text-muted-foreground" />
            <span>Billing History</span>
          </CardTitle>
        </CardHeader>
      <CardContent className="space-y-4">
        {payments.length > 0 && (
          <div className="flex items-center space-x-2 mb-6">
            <Search01Icon className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search payments by plan or transaction ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        )}

        {filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <CreditCardIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium text-muted-foreground mb-2">No payment history found</p>
            <p className="text-sm text-muted-foreground">
              {payments.length === 0 ? "You haven't made any payments yet" : "No payments match your search"}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold text-foreground text-center">Plan Details</TableHead>
                    <TableHead className="font-semibold text-foreground text-center">Amount</TableHead>
                    <TableHead className="font-semibold text-foreground text-center">Purchase Date</TableHead>
                    <TableHead className="font-semibold text-foreground text-center">Valid Until</TableHead>
                    <TableHead className="font-semibold text-foreground text-center">Status</TableHead>
                    <TableHead className="font-semibold text-foreground text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment, index) => {
                    const endDate = new Date(payment.paid_at);
                    endDate.setMonth(endDate.getMonth() + payment.period_months);
                    
                    return (
                       <TableRow 
                         key={payment.id}
                         className={`hover:bg-muted/50 transition-colors ${
                           index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                         }`}
                      >
                         <TableCell className="text-center">
                           <div className="space-y-1">
                             <p className="font-semibold">
                               {payment.plan_type === 'monthly' ? 'Monthly Plan' : payment.plan_type === 'quarterly' ? 'Quarterly Plan' : 'Annual Plan'}
                             </p>
                            <p className="text-sm text-muted-foreground">
                              {payment.period_months} {payment.period_months === 1 ? 'Month' : 'Months'} subscription
                            </p>
                          </div>
                         </TableCell>
                         <TableCell className="text-center">
                           <p className="font-semibold">{formatCurrency(payment.amount, payment.currency)}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <p className="text-sm">{formatDate(payment.paid_at)}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <p className="text-sm">{formatDate(endDate.toISOString())}</p>
                        </TableCell>
                        <TableCell className="text-center">{getStatusBadge(payment.status)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center space-x-2">
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => viewPaymentDetails(payment)}
                               className="h-8 w-8 rounded-full"
                              title="View Details"
                            >
                              <ViewIcon className="h-4 w-4" />
                            </Button>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => downloadInvoice(payment)}
                               disabled={downloadingInvoice === payment.id}
                               className="h-8 w-8 rounded-full"
                              title="Download Invoice"
                            >
                               {downloadingInvoice === payment.id ? (
                                 <Loading03Icon className="h-4 w-4 animate-spin" />
                               ) : (
                                 <Download01Icon className="h-4 w-4" />
                               )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {filteredPayments.map((payment) => {
                const endDate = new Date(payment.paid_at);
                endDate.setMonth(endDate.getMonth() + payment.period_months);
                
                return (
                  <Card key={payment.id} className="border hover:shadow-md transition-all duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                           <div className="text-lg font-bold mb-1">
                             {payment.plan_type === 'monthly' ? 'Monthly Plan' : payment.plan_type === 'quarterly' ? 'Quarterly Plan' : 'Annual Plan'}
                           </div>
                          <div className="text-sm text-muted-foreground">
                            {payment.period_months} {payment.period_months === 1 ? 'Month' : 'Months'} subscription
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          {getStatusBadge(payment.status)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Amount</div>
                           <div className="font-semibold">{formatCurrency(payment.amount, payment.currency)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Purchase Date</div>
                          <div className="text-sm font-medium">{formatDate(payment.paid_at)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Valid Until</div>
                          <div className="text-sm font-medium">{formatDate(endDate.toISOString())}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Payment ID</div>
                          <div className="text-xs font-mono bg-muted/50 px-2 py-1 rounded truncate">
                            {payment.razorpay_payment_id}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => viewPaymentDetails(payment)}
                           className="flex-1"
                        >
                          <ViewIcon className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => downloadInvoice(payment)}
                           disabled={downloadingInvoice === payment.id}
                           className="flex-1"
                        >
                           {downloadingInvoice === payment.id ? (
                             <>
                               <Loading03Icon className="h-4 w-4 mr-2 animate-spin" />
                               Downloading...
                             </>
                           ) : (
                             <>
                               <Download01Icon className="h-4 w-4 mr-2" />
                               Download
                             </>
                           )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>

    {/* Payment Details Dialog */}
    {selectedPayment && (
      <PaymentDetailsDialog
        open={showPaymentDetails}
        onOpenChange={setShowPaymentDetails}
        payment={selectedPayment}
      />
    )}
  </>
  );
};