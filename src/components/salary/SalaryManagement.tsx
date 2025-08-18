import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
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
import { DollarCircleIcon, UserIcon, MoneyBag02Icon, TaskDone01Icon, Calendar01Icon, Download01Icon, Settings02Icon } from 'hugeicons-react';
import { useToast } from '@/hooks/use-toast';
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
import FreelancerDetailedReportDialog from './FreelancerDetailedReportDialog';
import StaffDetailedReportDialog from './StaffDetailedReportDialog';

import SalaryCardView from './SalaryCardView';
import { useIsMobile } from '@/hooks/use-mobile';

const SalaryManagement = () => {
  const { profile, currentFirmId } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedForAssignment, setSelectedForAssignment] = useState<any>(null);
  const [detailedReportOpen, setDetailedReportOpen] = useState(false);
  const [selectedForDetailedReport, setSelectedForDetailedReport] = useState<any>(null);
  const [staffDetailedReportOpen, setStaffDetailedReportOpen] = useState(false);
  const [selectedStaffForDetailedReport, setSelectedStaffForDetailedReport] = useState<any>(null);
  
  
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

  console.log('Freelancer data for export:', freelancerData);
  console.log('Freelancer loading state:', freelancerLoading);

  // Show all data without filtering
  const staffDataToShow = staffData || [];
  const freelancerDataToShow = freelancerData || [];

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
    const normalizedRole = role.toLowerCase().replace(/\s+/g, '-');
    const roleMap: Record<string, string> = {
      'photographer': 'text-blue-600',
      'cinematographer': 'text-purple-600', 
      'videographer': 'text-purple-600',
      'drone-pilot': 'text-teal-600',
      'drone-operator': 'text-teal-600',
      'editor': 'text-cyan-400',
      'assistant': 'text-gray-600',
      'other': 'text-orange-600',
      'others': 'text-orange-600'
    };
    return roleMap[normalizedRole] || 'text-orange-600';
  };

  const handlePaySalary = (staff: any) => {
    // 🚀 FIXED: Check if staff has pending amount before opening dialog
    if (staff.pending_amount <= 0) {
      toast({
        title: "No pending amount",
        description: `${staff.full_name} has no pending payments to process.`,
        variant: "destructive",
      });
      return;
    }
    setSelectedStaff(staff);
    setPayDialogOpen(true);
  };

  const handleViewHistory = (staff: any) => {
    setSelectedStaff(staff);
    setHistoryDialogOpen(true);
  };

  const handlePayFreelancer = (freelancer: any) => {
    // 🚀 FIXED: Check if freelancer has pending amount before opening dialog
    if (freelancer.pending_amount <= 0) {
      toast({
        title: "No pending amount",
        description: `${freelancer.full_name} has no pending payments to process.`,
        variant: "destructive",
      });
      return;
    }
    setSelectedStaff({ ...freelancer, is_freelancer: true });
    setPayDialogOpen(true);
  };

  const handleViewFreelancerHistory = (freelancer: any) => {
    setSelectedStaff({ ...freelancer, is_freelancer: true });
    setHistoryDialogOpen(true);
  };

  const handleViewDetailedReport = (freelancer: any) => {
    setSelectedForDetailedReport(freelancer);
    setDetailedReportOpen(true);
  };

  const handleViewStaffDetailedReport = (staff: any) => {
    setSelectedStaffForDetailedReport(staff);
    setStaffDetailedReportOpen(true);
  };

  const handleAssignmentRates = (freelancer: any) => {
    setSelectedForAssignment({ ...freelancer, is_freelancer: true });
    setAssignmentDialogOpen(true);
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

  if (!currentFirmId) {
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
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Salary</h1>
        <div className="flex items-center gap-3">
          <UniversalExportDialog 
            data={[...staffDataToShow, ...freelancerDataToShow]}
            config={salaryExportConfig}
            key={`export-${freelancerData?.length || 0}`}
          />
        </div>
      </div>

      {/* Salary Stats */}
      <div className="mb-4">
        <SalaryStats stats={totalStats} loading={loading} />
      </div>

      {/* Tabs for Staff and Freelancers */}
      <Tabs defaultValue="staff" className="space-y-4">
        <TabsList>
          <TabsTrigger value="staff">Staff Salaries</TabsTrigger>
          <TabsTrigger value="freelancers">Freelancer Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="staff">
          {isMobile ? (
            <SalaryCardView
              data={staffDataToShow || []}
              type="staff"
              onPaySalary={handlePaySalary}
              onViewHistory={handleViewHistory}
              onAssignmentRates={(staff) => { setSelectedForAssignment(staff); setAssignmentDialogOpen(true); }}
              onDetailedReport={handleViewStaffDetailedReport}
              loading={loading}
            />
          ) : (
            <>
              {loading ? (
                <PageTableSkeleton />
              ) : staffDataToShow && staffDataToShow.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px] font-semibold">Staff Member</TableHead>
                        <TableHead className="min-w-[100px] font-semibold">Role</TableHead>
                        <TableHead className="text-center min-w-[100px] font-semibold">Assignments</TableHead>
                        <TableHead className="text-center min-w-[120px] font-semibold">Tasks</TableHead>
                        <TableHead className="text-right min-w-[120px] font-semibold">Task Earnings</TableHead>
                        <TableHead className="text-right min-w-[140px] font-semibold">Assignment Earnings</TableHead>
                        <TableHead className="text-right min-w-[120px] font-semibold">Total Earnings</TableHead>
                        <TableHead className="text-right min-w-[120px] font-semibold">Paid Amount</TableHead>
                        <TableHead className="text-right min-w-[120px] font-semibold">Pending Amount</TableHead>
                        <TableHead className="text-center min-w-[160px] font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffDataToShow.map((staff) => (
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
                            <span className={`text-sm font-medium ${getRoleColor(staff.role)}`}>
                              {staff.role}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center">
                              <TaskDone01Icon className="h-4 w-4 mr-1 text-muted-foreground" />
                              {staff.total_assignments}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <span className="text-sm font-medium text-blue-600">
                                {staff.total_tasks}
                              </span>
                              <span className="text-sm text-muted-foreground">=</span>
                              <span className="text-sm font-medium text-green-600">
                                {staff.completed_tasks}
                              </span>
                              <span className="text-sm text-muted-foreground">+</span>
                              <span className="text-sm font-medium text-red-600">
                                {staff.total_tasks - staff.completed_tasks}
                              </span>
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
                            <span className="text-sm font-medium text-blue-600">
                              ₹{staff.paid_amount.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span 
                              className={`text-sm font-medium ${staff.pending_amount > 0 
                                ? "text-orange-600" 
                                : "text-gray-600"
                              }`}
                            >
                              ₹{staff.pending_amount.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="action-edit"
                                size="sm"
                                onClick={() => handlePaySalary(staff)}
                                className={cn(
                                  "h-9 w-9 p-0 rounded-full",
                                  staff.pending_amount <= 0 
                                    ? "cursor-not-allowed opacity-50" 
                                    : "cursor-pointer"
                                )}
                                title={staff.pending_amount <= 0 ? "No pending payment" : "Pay salary"}
                                disabled={staff.pending_amount <= 0}
                              >
                                <DollarCircleIcon className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="action-neutral"
                                size="sm"
                                onClick={() => { setSelectedForAssignment(staff); setAssignmentDialogOpen(true); }}
                                className="h-9 w-9 p-0 rounded-full"
                                title="Assignment rates"
                              >
                                <Settings02Icon className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="action-report"
                                size="sm"
                                onClick={() => handleViewStaffDetailedReport(staff)}
                                className="h-9 w-9 p-0 rounded-full"
                                title="Detailed report"
                              >
                                <Download01Icon className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="action-status"
                                size="sm"
                                onClick={() => handleViewHistory(staff)}
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
              ) : (
                <div className="text-center py-12">
                  <UserIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Staff Members Found</h3>
                  <p className="text-muted-foreground">
                    No staff members are currently registered in your firm.
                  </p>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="freelancers">
          {isMobile ? (
            <SalaryCardView
              data={freelancerDataToShow || []}
              type="freelancer"
              onPaySalary={handlePayFreelancer}
              onViewHistory={handleViewFreelancerHistory}
              onAssignmentRates={handleAssignmentRates}
              onDetailedReport={handleViewDetailedReport}
              loading={freelancerLoading}
            />
          ) : (
            <>
              {freelancerLoading ? (
                <PageTableSkeleton />
              ) : freelancerDataToShow && freelancerDataToShow.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">Freelancer</TableHead>
                        <TableHead className="font-semibold">Role</TableHead>
                        <TableHead className="text-center font-semibold">Assignments</TableHead>
                        <TableHead className="text-center font-semibold">Tasks</TableHead>
                        <TableHead className="text-right font-semibold">Task Earnings</TableHead>
                        <TableHead className="text-right font-semibold">Assignment Earnings</TableHead>
                        <TableHead className="text-right font-semibold">Total Earnings</TableHead>
                        <TableHead className="text-right font-semibold">Paid Amount</TableHead>
                        <TableHead className="text-right font-semibold">Pending Amount</TableHead>
                        <TableHead className="text-center font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {freelancerDataToShow.map((freelancer) => (
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
                            <span className={`text-sm font-medium ${getRoleColor(freelancer.role)}`}>
                              {freelancer.role}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center">
                              <TaskDone01Icon className="h-4 w-4 mr-1 text-muted-foreground" />
                              {freelancer.total_assignments}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <span className="text-sm font-medium text-blue-600">
                                {freelancer.total_tasks}
                              </span>
                              <span className="text-sm text-muted-foreground">=</span>
                              <span className="text-sm font-medium text-green-600">
                                {freelancer.completed_tasks}
                              </span>
                              <span className="text-sm text-muted-foreground">+</span>
                              <span className="text-sm font-medium text-red-600">
                                {freelancer.total_tasks - freelancer.completed_tasks}
                              </span>
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
                            <span className="text-sm font-medium text-blue-600">
                              ₹{freelancer.paid_amount.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span 
                              className={`text-sm font-medium ${freelancer.pending_amount > 0 
                                ? "text-orange-600" 
                                : "text-gray-600"
                              }`}
                            >
                              ₹{freelancer.pending_amount.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="action-edit"
                                size="sm"
                                onClick={() => handlePayFreelancer(freelancer)}
                                className={cn(
                                  "h-9 w-9 p-0 rounded-full",
                                  freelancer.pending_amount <= 0 
                                    ? "cursor-not-allowed opacity-50" 
                                    : "cursor-pointer"
                                )}
                                title={freelancer.pending_amount <= 0 ? "No pending payment" : "Pay freelancer"}
                                disabled={freelancer.pending_amount <= 0}
                              >
                                <DollarCircleIcon className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="action-neutral"
                                size="sm"
                                onClick={() => handleAssignmentRates(freelancer)}
                                className="h-9 w-9 p-0 rounded-full"
                                title="Assignment rates"
                              >
                                <Settings02Icon className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="action-report"
                                size="sm"
                                onClick={() => handleViewDetailedReport(freelancer)}
                                className="h-9 w-9 p-0 rounded-full"
                                title="Detailed report"
                              >
                                <Download01Icon className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="action-status"
                                size="sm"
                                onClick={() => handleViewFreelancerHistory(freelancer)}
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
              ) : (
                <div className="text-center py-12">
                  <UserIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Freelancers Found</h3>
                  <p className="text-muted-foreground">
                    No freelancers are currently registered in your firm.
                  </p>
                </div>
              )}
            </>
          )}
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

<FreelancerDetailedReportDialog
  freelancer={selectedForDetailedReport}
  open={detailedReportOpen}
  onOpenChange={setDetailedReportOpen}
/>

<StaffDetailedReportDialog
  staff={selectedStaffForDetailedReport}
  open={staffDetailedReportOpen}
  onOpenChange={setStaffDetailedReportOpen}
/>
    </>
  );
};

export default SalaryManagement;