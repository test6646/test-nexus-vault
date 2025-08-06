import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { DollarCircleIcon, UserIcon, MoneyBag02Icon, TaskDone01Icon, Calendar01Icon, Download01Icon } from 'hugeicons-react';
import { PageTableSkeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import SalaryStats from './SalaryStats';
import PaySalaryDialog from './PaySalaryDialog';
import SalaryHistoryDialog from './SalaryHistoryDialog';
import UniversalExportDialog from '@/components/common/UniversalExportDialog';
import { useSalaryExportConfig } from '@/hooks/useExportConfigs';
import { useSalaryData } from './hooks/useSalaryData';
import { useFreelancerSalaryData } from '@/components/freelancers/hooks/useFreelancerSalaryData';
import EventAssignmentRatesDialog from './EventAssignmentRatesDialog';

const SalaryManagement = () => {
  const { profile } = useAuth();
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedForAssignment, setSelectedForAssignment] = useState<any>(null);
  
  const { 
    staffData, 
    totalStats, 
    loading, 
    refetch: refetchStaff
  } = useSalaryData();

  const { 
    freelancerData, 
    totalStats: freelancerStats, 
    loading: freelancerLoading,
    refetch: refetchFreelancers
  } = useFreelancerSalaryData();

  const salaryExportConfig = useSalaryExportConfig(staffData || [], freelancerData || [], totalStats);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Photographer':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Cinematographer':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Editor':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handlePaySalary = (staff: any) => {
    setSelectedStaff(staff);
    setPayDialogOpen(true);
  };

  const handleViewHistory = (staff: any) => {
    setSelectedStaff(staff);
    setHistoryDialogOpen(true);
  };

  const handlePayFreelancer = (freelancer: any) => {
    setSelectedStaff({ ...freelancer, is_freelancer: true });
    setPayDialogOpen(true);
  };

  const handleViewFreelancerHistory = (freelancer: any) => {
    setSelectedStaff({ ...freelancer, is_freelancer: true });
    setHistoryDialogOpen(true);
  };

  const onPaymentSuccess = () => {
    refetchStaff();
    refetchFreelancers();
    setPayDialogOpen(false);
  };

  // Global refetch function that refreshes all data
  const refetchAll = () => {
    refetchStaff();
    refetchFreelancers();
  };

  // Add keyboard shortcut for quick refresh
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
        e.preventDefault();
        refetchAll();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [refetchAll]);

  if (!profile?.current_firm_id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center">
          <CardContent>
            <UserIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Firm Selected</h3>
            <p className="text-muted-foreground">Please select a firm to view salary information.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Salary</h1>
          <div className="flex items-center gap-3">
            <UniversalExportDialog 
              data={[...(staffData || []), ...(freelancerData || [])]}
              config={salaryExportConfig}
            />
            <Badge variant="secondary" className="px-3 py-1.5 bg-primary/10 text-primary border-primary/20">
              <MoneyBag02Icon className="h-4 w-4 mr-1.5" />
              {staffData?.length || 0} Staff
            </Badge>
          </div>
        </div>

        {/* Salary Stats */}
        <SalaryStats stats={totalStats} loading={loading} />
      </div>

      {/* Tabs for Staff and Freelancers */}
      <Tabs defaultValue="staff" className="space-y-4">
        <TabsList>
          <TabsTrigger value="staff">Staff Salaries</TabsTrigger>
          <TabsTrigger value="freelancers">Freelancer Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="staff">
          {/* Staff Salary Table */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg font-semibold">
                <UserIcon className="h-5 w-5 mr-2 text-primary" />
                Staff Salary Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
          {loading ? (
            <PageTableSkeleton />
          ) : staffData && staffData.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-center">Assignments</TableHead>
                    <TableHead className="text-center">Total Tasks</TableHead>
                    <TableHead className="text-center">Completed Tasks</TableHead>
                    <TableHead className="text-right">Task Earnings</TableHead>
                    <TableHead className="text-right">Assignment Earnings</TableHead>
                    <TableHead className="text-right">Total Earnings</TableHead>
                    <TableHead className="text-right">Paid Amount</TableHead>
                    <TableHead className="text-right">Pending Amount</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffData.map((staff) => (
                    <TableRow key={staff.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                              {getInitials(staff.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{staff.full_name}</p>
                            <p className="text-sm text-muted-foreground">{staff.mobile_number}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(staff.role)}>
                          {staff.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          <TaskDone01Icon className="h-4 w-4 mr-1 text-muted-foreground" />
                          {staff.total_assignments}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          <TaskDone01Icon className="h-4 w-4 mr-1 text-muted-foreground" />
                          {staff.total_tasks}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {staff.completed_tasks}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ₹{staff.task_earnings.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ₹{staff.assignment_earnings.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ₹{staff.total_earnings.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          ₹{staff.paid_amount.toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant="outline" 
                          className={staff.pending_amount > 0 
                            ? "bg-orange-50 text-orange-700 border-orange-200" 
                            : "bg-gray-50 text-gray-700 border-gray-200"
                          }
                        >
                          ₹{staff.pending_amount.toLocaleString()}
                        </Badge>
                      </TableCell>
<TableCell>
  <div className="flex items-center justify-center space-x-2">
    <Button
      size="sm"
      onClick={() => handlePaySalary(staff)}
      className="h-8"
    >
      <DollarCircleIcon className="h-4 w-4 mr-1" />
      Pay
    </Button>
    <Button
      size="sm"
      variant="outline"
      onClick={() => { setSelectedForAssignment(staff); setAssignmentDialogOpen(true); }}
      className="h-8"
    >
      Assignments
    </Button>
    <Button
      size="sm"
      variant="outline"
      onClick={() => handleViewHistory(staff)}
      className="h-8"
    >
      <Calendar01Icon className="h-4 w-4 mr-1" />
      History
    </Button>
  </div>
</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <UserIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Staff Members Found</h3>
              <p className="text-muted-foreground">
                No staff members are currently registered in your firm.
              </p>
            </div>
          )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="freelancers">
          {/* Freelancer Payments Table */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg font-semibold">
                <UserIcon className="h-5 w-5 mr-2 text-primary" />
                Freelancer Payment Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {freelancerLoading ? (
                <PageTableSkeleton />
              ) : freelancerData && freelancerData.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Freelancer</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-center">Assignments</TableHead>
                        <TableHead className="text-center">Total Tasks</TableHead>
                        <TableHead className="text-center">Completed Tasks</TableHead>
                        <TableHead className="text-right">Task Earnings</TableHead>
                        <TableHead className="text-right">Assignment Earnings</TableHead>
                        <TableHead className="text-right">Total Earnings</TableHead>
                        <TableHead className="text-right">Paid Amount</TableHead>
                        <TableHead className="text-right">Pending Amount</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {freelancerData.map((freelancer) => (
                        <TableRow key={freelancer.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-secondary text-secondary-foreground font-semibold">
                                  {getInitials(freelancer.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{freelancer.full_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {freelancer.phone || freelancer.email || 'No contact'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getRoleColor(freelancer.role)}>
                              {freelancer.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center">
                              <TaskDone01Icon className="h-4 w-4 mr-1 text-muted-foreground" />
                              {freelancer.total_assignments}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center">
                              <TaskDone01Icon className="h-4 w-4 mr-1 text-muted-foreground" />
                              {freelancer.total_tasks}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center">
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {freelancer.completed_tasks}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ₹{freelancer.task_earnings.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ₹{freelancer.assignment_earnings.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ₹{freelancer.total_earnings.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              ₹{freelancer.paid_amount.toLocaleString()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge 
                              variant="outline" 
                              className={freelancer.pending_amount > 0 
                                ? "bg-orange-50 text-orange-700 border-orange-200" 
                                : "bg-gray-50 text-gray-700 border-gray-200"
                              }
                            >
                              ₹{freelancer.pending_amount.toLocaleString()}
                            </Badge>
                          </TableCell>
                          <TableCell>
<div className="flex items-center justify-center space-x-2">
  <Button
    size="sm"
    onClick={() => handlePayFreelancer(freelancer)}
    className="h-8"
  >
    <DollarCircleIcon className="h-4 w-4 mr-1" />
    Pay
  </Button>
  <Button
    size="sm"
    variant="outline"
    onClick={() => { setSelectedForAssignment({ ...freelancer, is_freelancer: true }); setAssignmentDialogOpen(true); }}
    className="h-8"
  >
    Assignments
  </Button>
  <Button
    size="sm"
    variant="outline"
    onClick={() => handleViewFreelancerHistory(freelancer)}
    className="h-8"
  >
    <Calendar01Icon className="h-4 w-4 mr-1" />
    History
  </Button>
</div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <UserIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Freelancers Found</h3>
                  <p className="text-muted-foreground">
                    No freelancers are currently registered in your firm.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

{/* Dialogs */}
{selectedStaff && (
  <>
    <PaySalaryDialog
      open={payDialogOpen}
      onOpenChange={setPayDialogOpen}
      staff={selectedStaff}
      onSuccess={onPaymentSuccess}
    />
    <SalaryHistoryDialog
      open={historyDialogOpen}
      onOpenChange={setHistoryDialogOpen}
      staff={selectedStaff}
    />
  </>
)}
{selectedForAssignment && (
  <EventAssignmentRatesDialog
    open={assignmentDialogOpen}
    onOpenChange={setAssignmentDialogOpen}
    staff={selectedForAssignment}
    onSuccess={() => { 
      setAssignmentDialogOpen(false); 
      setSelectedForAssignment(null); 
      // Refresh all data to ensure real-time updates
      refetchAll(); 
    }}
  />
)}
    </div>
  );
};

export default SalaryManagement;