import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  UserIcon, 
  MoneyBag02Icon, 
  Calendar01Icon, 
  TaskDone01Icon,
  Download01Icon,
  CreditCardIcon
} from 'hugeicons-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getRoleTextColor } from '@/lib/status-colors';
import { generateStaffDetailedReportPDF } from '@/components/salary/StaffDetailedReportPDF';
import { displayRole } from '@/lib/role-utils';

interface DetailedEventBreakdown {
  eventId: string;
  eventTitle: string;
  eventType: string;
  clientName: string;
  roles: string[];
  totalDays: number;
  ratePerDay: number;
  totalEventPayment: number;
  workDates?: string[];
}

interface PaymentRecord {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  description?: string;
  eventId?: string;
  eventTitle?: string;
}

interface StaffData {
  id: string;
  full_name: string;
  role: string;
  mobile_number?: string;
  total_assignments: number;
  total_tasks: number;
  completed_tasks: number;
  task_earnings: number;
  assignment_earnings: number;
  total_earnings: number;
  paid_amount: number;
  pending_amount: number;
  detailedEventBreakdown?: DetailedEventBreakdown[];
  paymentHistory?: PaymentRecord[];
}

interface StaffDetailedReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffData | null;
}

const StaffDetailedReportDialog = ({ 
  open, 
  onOpenChange, 
  staff 
}: StaffDetailedReportDialogProps) => {
  if (!staff) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getRoleColor = (role: string) => {
    return getRoleTextColor(role);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] md:max-w-[600px] max-h-[70vh] md:max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
                {getInitials(staff.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="text-left min-w-0 flex-1">
              <h2 className="text-base font-bold truncate">{staff.full_name}</h2>
              <p className="text-xs text-muted-foreground">Detailed Report</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {/* Staff Summary */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg flex-shrink-0">
            <div className="text-center">
              <div className="text-lg font-bold text-primary">₹{staff.total_earnings.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total Earnings</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">₹{staff.paid_amount.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Paid Amount</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">₹{staff.pending_amount.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Pending Amount</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{staff.total_assignments}</div>
              <div className="text-xs text-muted-foreground">Total Events</div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="space-y-3 p-3 border rounded-lg">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center">
                <UserIcon className="h-4 w-4 mr-2 text-primary" />
                Personal Info
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1">
                  <span className="font-medium">Role:</span> 
                  <span className={`text-xs font-medium ${getRoleTextColor(staff.role)}`}>
                    {displayRole(staff.role)}
                  </span>
                </div>
                {staff.mobile_number && (
                  <p><span className="font-medium">Mobile:</span> <span className="break-all">{staff.mobile_number}</span></p>
                )}
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center">
                <MoneyBag02Icon className="h-4 w-4 mr-2 text-primary" />
                Earnings
              </h4>
              <div className="space-y-1 text-xs">
                <p><span className="font-medium">Assignments:</span> ₹{staff.assignment_earnings.toLocaleString()}</p>
                <p><span className="font-medium">Tasks:</span> ₹{staff.task_earnings.toLocaleString()}</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center">
                <TaskDone01Icon className="h-4 w-4 mr-2 text-primary" />
                Work Stats
              </h4>
              <div className="space-y-1 text-xs">
                <p><span className="font-medium">Total Tasks:</span> {staff.total_tasks}</p>
                <p><span className="font-medium">Completed:</span> {staff.completed_tasks}</p>
                <p><span className="font-medium">Rate:</span> {staff.total_tasks > 0 ? Math.round((staff.completed_tasks / staff.total_tasks) * 100) : 0}%</p>
              </div>
            </div>
          </div>

          {/* Event Work Breakdown */}
          {staff.detailedEventBreakdown && staff.detailedEventBreakdown.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center">
                <Calendar01Icon className="h-4 w-4 mr-2 text-primary" />
                Event Work History
              </h3>
              <div className="space-y-2">
                {staff.detailedEventBreakdown.map((event, index) => (
                  <Card key={event.eventId} className="border">
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm break-words">{event.eventTitle}</p>
                            <p className="text-xs text-muted-foreground break-words">{event.clientName}</p>
                          </div>
                          <Badge variant="outline" className="text-xs ml-2">
                            {event.eventType}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex gap-1 flex-wrap">
                            {event.roles.map((role, roleIndex) => (
                              <span key={roleIndex} className={`text-xs font-medium ${getRoleTextColor(role)}`}>
                                {role}
                              </span>
                            ))}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">{event.totalDays} days</p>
                            <p className="text-sm font-bold text-green-600">₹{event.totalEventPayment.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Payment History */}
          {staff.paymentHistory && staff.paymentHistory.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center">
                <CreditCardIcon className="h-4 w-4 mr-2 text-primary" />
                Payment History
              </h3>
              <div className="space-y-2">
                {staff.paymentHistory
                  .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                  .map((payment, index) => (
                  <Card key={payment.id} className="border">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{formatDate(payment.paymentDate)}</p>
                          <p className="text-xs text-muted-foreground break-words">
                            {payment.eventTitle || 'General Payment'}
                          </p>
                          {payment.description && (
                            <p className="text-xs text-muted-foreground break-words mt-1">
                              {payment.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-2">
                          <p className="text-sm font-bold text-green-600">₹{payment.amount.toLocaleString()}</p>
                          <Badge variant="outline" className="text-xs">{payment.paymentMethod}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Summary and Actions */}
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
            <div className="text-xs text-muted-foreground text-center">
              Events: {staff.detailedEventBreakdown?.length || 0} | Payments: {staff.paymentHistory?.length || 0}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t pt-3 space-y-3 flex-shrink-0">
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="h-10 text-sm"
            >
              Close
            </Button>
            <Button 
              onClick={async () => {
                await generateStaffDetailedReportPDF(staff);
              }}
              className="h-10 text-sm"
            >
              <Download01Icon className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StaffDetailedReportDialog;