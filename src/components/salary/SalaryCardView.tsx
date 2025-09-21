import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { 
  DollarCircleIcon, 
  UserIcon, 
  TaskDone01Icon, 
  Calendar01Icon, 
  Download01Icon, 
  Settings02Icon,
  Briefcase01Icon
} from 'hugeicons-react';
import { displayRole } from '@/lib/role-utils';
import { getRoleTextColor } from '@/lib/status-colors';

interface SalaryCardViewProps {
  data: any[];
  type: 'staff' | 'freelancer' | 'mixed';
  onPaySalary: (item: any) => void;
  onViewHistory: (item: any) => void;
  onAssignmentRates?: (item: any) => void;
  onDetailedReport?: (item: any) => void;
  loading?: boolean;
}

const SalaryCardView = ({ 
  data, 
  type, 
  onPaySalary, 
  onViewHistory, 
  onAssignmentRates, 
  onDetailedReport,
  loading 
}: SalaryCardViewProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    return getRoleTextColor(role);
  };

  if (loading) {
    return (
      <div className="grid gap-3 sm:gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                <div className="h-10 w-10 bg-muted rounded-full" />
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-3 w-16 bg-muted rounded" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                <div className="h-6 bg-muted rounded" />
                <div className="h-6 bg-muted rounded" />
                <div className="h-6 bg-muted rounded" />
                <div className="h-6 bg-muted rounded" />
              </div>
              <div className="flex gap-1.5 sm:gap-2">
                <div className="h-8 w-8 bg-muted rounded-full" />
                <div className="h-8 w-8 bg-muted rounded-full" />
                <div className="h-8 w-8 bg-muted rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <UserIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          No {type === 'staff' ? 'Staff Members' : type === 'freelancer' ? 'Freelancers' : 'Staff or Freelancers'} Found
        </h3>
        <p className="text-muted-foreground">
          No {type === 'staff' ? 'staff members are currently registered' : type === 'freelancer' ? 'freelancers are currently registered' : 'staff members or freelancers are currently registered'} in your firm.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {data.map((item) => (
        <Card key={item.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            {/* Header - Name and Role */}
            <div className="flex items-center space-x-3 mb-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {getInitials(item.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-base truncate">{item.full_name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${getRoleColor(item.role)}`}>
                    {displayRole(item.role)}
                  </span>
                  {item.mobile_number && (
                    <span className="text-xs text-muted-foreground">
                      {item.mobile_number}
                    </span>
                  )}
                  {item.phone && (
                    <span className="text-xs text-muted-foreground">
                      {item.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="text-center p-2 bg-muted/30 rounded">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TaskDone01Icon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Assignments</span>
                </div>
                <span className="text-sm font-semibold">{item.total_assignments || 0}</span>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TaskDone01Icon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Tasks</span>
                </div>
                <span className="text-sm font-semibold">{item.total_tasks || 0}</span>
              </div>
              <div className="text-center p-2 bg-success-subtle rounded">
                <div className="text-xs text-success mb-1">Total Earned</div>
                <span className="text-sm font-bold text-success">
                  ₹{item.total_earnings?.toLocaleString()}
                </span>
              </div>
              <div className="text-center p-2 bg-info-subtle rounded">
                <div className="text-xs text-info mb-1">Paid</div>
                <span className="text-sm font-bold text-info">
                  ₹{item.paid_amount?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Pending Amount */}
            <div className="mb-4">
              <div className={cn(
                "w-full text-center py-2 px-3 rounded text-sm font-medium",
                item.pending_amount > 0 
                  ? "text-warning bg-warning-subtle" 
                  : "text-muted-foreground bg-muted"
              )}>
                Pending: ₹{item.pending_amount?.toLocaleString()}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="action-edit"
                size="sm"
                onClick={() => onPaySalary(item)}
                className={cn(
                  "h-8 w-8 p-0 rounded-full transition-all duration-200",
                  item.pending_amount <= 0 
                    ? "cursor-not-allowed opacity-50" 
                    : "cursor-pointer hover:scale-105"
                )}
                title={item.pending_amount <= 0 ? "No pending payment" : "Pay salary"}
                disabled={item.pending_amount <= 0}
              >
                <DollarCircleIcon className="h-3.5 w-3.5" />
              </Button>
              
              {onAssignmentRates && (
                <Button
                  variant="action-neutral"
                  size="sm"
                  onClick={() => onAssignmentRates(item)}
                  className="h-8 w-8 p-0 rounded-full"
                  title="Assignment rates"
                >
                  <Settings02Icon className="h-3.5 w-3.5" />
                </Button>
              )}
              
              {onDetailedReport && (
                <Button
                  variant="action-report"
                  size="sm"
                  onClick={() => onDetailedReport(item)}
                  className="h-8 w-8 p-0 rounded-full"
                  title="Detailed report"
                >
                  <Download01Icon className="h-3.5 w-3.5" />
                </Button>
              )}
              
                <Button
                  variant="action-status"
                  size="sm"
                  onClick={() => onViewHistory(item)}
                  className="h-8 w-8 p-0 rounded-full"
                  title="View payment history"
                >
                  <Calendar01Icon className="h-3.5 w-3.5" />
                </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SalaryCardView;