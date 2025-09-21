import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  DollarCircleIcon, 
  UserIcon, 
  Briefcase01Icon, 
  TaskDone01Icon, 
  Calendar01Icon, 
  Download01Icon, 
  Settings02Icon 
} from 'hugeicons-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getRoleTextColor } from '@/lib/status-colors';
import { displayRole } from '@/lib/role-utils';

interface SalaryTableViewProps {
  data: any[];
  type: 'staff' | 'freelancer' | 'mixed';
  onPaySalary: (person: any) => void;
  onViewHistory: (person: any) => void;
  onAssignmentRates: (person: any) => void;
  onDetailedReport: (person: any) => void;
}

export const SalaryTableView: React.FC<SalaryTableViewProps> = ({
  data,
  type,
  onPaySalary,
  onViewHistory,
  onAssignmentRates,
  onDetailedReport
}) => {
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

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={type === 'staff' ? UserIcon : Briefcase01Icon}
        title={`No ${type === 'staff' ? 'Staff' : type === 'freelancer' ? 'Freelancers' : 'People'} Found`}
        description={`No ${type === 'staff' ? 'staff members' : type === 'freelancer' ? 'freelancers' : 'people'} found matching your criteria.`}
      />
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center font-semibold">
              {type === 'staff' ? 'Staff' : type === 'freelancer' ? 'Freelancer' : 'Name'}
            </TableHead>
            <TableHead className="text-center font-semibold">Role</TableHead>
            <TableHead className="text-center font-semibold">Assignments</TableHead>
            <TableHead className="text-center font-semibold">Tasks</TableHead>
            <TableHead className="text-center font-semibold">Earnings</TableHead>
            <TableHead className="text-center font-semibold">Paid</TableHead>
            <TableHead className="text-center font-semibold">Pending</TableHead>
            <TableHead className="text-center font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((person) => (
            <TableRow key={type === 'mixed' ? `${person.type}-${person.id}` : person.id} className="hover:bg-muted/50">
              <TableCell className="text-center">
                <div className="flex items-center justify-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {getInitials(person.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{person.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {type === 'staff' || (type === 'mixed' && person.type === 'staff') 
                        ? person.mobile_number 
                        : (person.phone || person.email || 'No contact')}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className={`text-sm font-medium ${getRoleColor(person.role)}`}>
                  {type === 'staff' || (type === 'mixed' && person.type === 'staff') 
                    ? displayRole(person.role) 
                    : person.role}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center">
                  <Briefcase01Icon className="h-4 w-4 mr-1 text-muted-foreground" />
                  {person.total_assignments || 0}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center space-x-1">
                  <span className="text-sm font-medium text-blue-600">
                    {person.total_tasks || 0}
                  </span>
                  <span className="text-sm text-muted-foreground">=</span>
                  <span className="text-sm font-medium text-green-600">
                    {person.completed_tasks || 0}
                  </span>
                  <span className="text-sm text-muted-foreground">+</span>
                  <span className="text-sm font-medium text-red-600">
                    {(person.total_tasks || 0) - (person.completed_tasks || 0)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex flex-col items-center space-y-1">
                  <span className="font-semibold">₹{person.total_earnings?.toLocaleString() || '0'}</span>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <TaskDone01Icon className="h-3 w-3" />
                      <span>₹{person.task_earnings?.toLocaleString() || '0'}</span>
                    </div>
                    <span>+</span>
                    <div className="flex items-center space-x-1">
                      <Briefcase01Icon className="h-3 w-3" />
                      <span>₹{person.assignment_earnings?.toLocaleString() || '0'}</span>
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-sm font-medium text-blue-600">
                  ₹{person.paid_amount?.toLocaleString() || '0'}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span
                  className={`text-sm font-medium ${(person.pending_amount || 0) > 0
                    ? "text-orange-600"
                    : "text-gray-600"
                    }`}
                >
                  ₹{person.pending_amount?.toLocaleString() || '0'}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="action-edit"
                    size="sm"
                    onClick={() => onPaySalary(person)}
                    className={cn(
                      "h-9 w-9 p-0 rounded-full",
                      (person.pending_amount || 0) <= 0
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer"
                    )}
                    title={(person.pending_amount || 0) <= 0 ? "No pending payment" : "Pay salary"}
                    disabled={(person.pending_amount || 0) <= 0}
                  >
                    <DollarCircleIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="action-neutral"
                    size="sm"
                    onClick={() => onAssignmentRates(person)}
                    className="h-9 w-9 p-0 rounded-full"
                    title="Assignment rates"
                  >
                    <Settings02Icon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="action-report"
                    size="sm"
                    onClick={() => onDetailedReport(person)}
                    className="h-9 w-9 p-0 rounded-full"
                    title="Detailed report"
                  >
                    <Download01Icon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="action-status"
                    size="sm"
                    onClick={() => onViewHistory(person)}
                    className="h-9 w-9 p-0 rounded-full"
                    title="View payment history"
                  >
                    <Calendar01Icon className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};