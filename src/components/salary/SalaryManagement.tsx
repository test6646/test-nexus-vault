import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserIcon, UserGroupIcon } from 'hugeicons-react';
import { useToast } from '@/hooks/use-toast';
import { PageTableSkeleton } from '@/components/ui/skeleton';
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
import { SalaryTableView } from './SalaryTableView';
import { useIsMobile } from '@/hooks/use-mobile';

const SalaryManagement = () => {
  const { currentFirmId } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Core states
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedForAssignment, setSelectedForAssignment] = useState<any>(null);
  const [detailedReportOpen, setDetailedReportOpen] = useState(false);
  const [selectedForDetailedReport, setSelectedForDetailedReport] = useState<any>(null);
  const [staffDetailedReportOpen, setStaffDetailedReportOpen] = useState(false);
  const [selectedStaffForDetailedReport, setSelectedStaffForDetailedReport] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'staff' | 'freelancer'>('staff');

  // Data hooks
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

  // Combined data for salary page with mode filtering - BACKEND FILTERING IMPLEMENTED
  const combinedData = useMemo(() => {
    const staffWithType = (staffData || []).map(staff => ({ ...staff, type: 'staff' as const, category: 'Staff' }));
    const freelancersWithType = (freelancerData || []).map(freelancer => ({ ...freelancer, type: 'freelancer' as const, category: 'Freelancer' }));
    
    // Filter based on view mode - this is the main filtering logic
    if (viewMode === 'staff') {
      return staffWithType;
    } else {
      return freelancersWithType;
    }
  }, [staffData, freelancerData, viewMode]);

  // Mode-specific stats calculation
  const combinedStats = useMemo(() => {
    if (viewMode === 'staff') {
      const staffTaskEarnings = staffData.reduce((sum, staff) => sum + (staff.task_earnings || 0), 0);
      const staffAssignmentEarnings = staffData.reduce((sum, staff) => sum + (staff.assignment_earnings || 0), 0);
      const staffTotalEarnings = staffData.reduce((sum, staff) => sum + (staff.total_earnings || 0), 0);
      const staffTotalPaid = staffData.reduce((sum, staff) => sum + (staff.paid_amount || 0), 0);
      const staffTotalPending = staffData.reduce((sum, staff) => sum + (staff.pending_amount || 0), 0);
      const staffCount = staffData.length;

      return {
        totalStaff: staffCount,
        totalFreelancers: 0,
        taskPaymentsTotal: staffTaskEarnings,
        assignmentRatesTotal: staffAssignmentEarnings,
        totalPaid: staffTotalPaid,
        totalPending: staffTotalPending,
        avgPerPerson: staffCount > 0 ? staffTotalEarnings / staffCount : 0,
        totalEarnings: staffTotalEarnings,
      };
    } else {
      const freelancerTaskEarnings = freelancerData?.reduce((sum, f) => sum + (f.task_earnings || 0), 0) || 0;
      const freelancerAssignmentEarnings = freelancerData?.reduce((sum, f) => sum + (f.assignment_earnings || 0), 0) || 0;
      const freelancerTotalEarnings = freelancerData?.reduce((sum, f) => sum + (f.total_earnings || 0), 0) || 0;
      const freelancerTotalPaid = freelancerData?.reduce((sum, f) => sum + (f.paid_amount || 0), 0) || 0;
      const freelancerTotalPending = freelancerData?.reduce((sum, f) => sum + (f.pending_amount || 0), 0) || 0;
      const freelancerCount = freelancerData?.length || 0;

      return {
        totalStaff: 0,
        totalFreelancers: freelancerCount,
        taskPaymentsTotal: freelancerTaskEarnings,
        assignmentRatesTotal: freelancerAssignmentEarnings,
        totalPaid: freelancerTotalPaid,
        totalPending: freelancerTotalPending,
        avgPerPerson: freelancerCount > 0 ? freelancerTotalEarnings / freelancerCount : 0,
        totalEarnings: freelancerTotalEarnings,
      };
    }
  }, [staffData, freelancerData, viewMode]);

  const salaryExportConfig = useSalaryExportConfig(staffData || [], freelancerData || [], combinedStats);

  // Event handlers
  const handlePaySalary = (person: any) => {
    if ((person.pending_amount || 0) <= 0) {
      toast({
        title: "No pending amount",
        description: `${person.full_name} has no pending payments to process.`,
        variant: "destructive",
      });
      return;
    }
    setSelectedStaff(person);
    setPayDialogOpen(true);
  };

  const handleViewHistory = (person: any) => {
    setSelectedStaff(person);
    setHistoryDialogOpen(true);
  };

  const handleViewDetailedReport = (person: any) => {
    if (person.type === 'freelancer') {
      setSelectedForDetailedReport(person);
      setDetailedReportOpen(true);
    } else {
      setSelectedStaffForDetailedReport(person);
      setStaffDetailedReportOpen(true);
    }
  };

  const handleAssignmentRates = (person: any) => {
    setSelectedForAssignment(person);
    setAssignmentDialogOpen(true);
  };

  const onPaymentSuccess = () => {
    refetchStaff();
    refetchFreelancers();
    setPayDialogOpen(false);
  };

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

  if (loading || freelancerLoading) {
    return <PageTableSkeleton />;
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Salary</h1>
        <div className="flex items-center gap-3">
          {/* Mode Switcher - Backend filtering by mode */}
          <div className="flex items-center gap-1 rounded-full border p-1">
            <Button
              variant={viewMode === 'staff' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('staff')}
              className="h-8 w-8 rounded-full p-0"
              title="Staff Only"
            >
              <UserIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'freelancer' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('freelancer')}
              className="h-8 w-8 rounded-full p-0"
              title="Freelancers Only"
            >
              <UserGroupIcon className="h-4 w-4" />
            </Button>
          </div>
          
          <UniversalExportDialog
            data={combinedData}
            config={salaryExportConfig}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4">
        <SalaryStats
          stats={combinedStats}
          loading={loading || freelancerLoading}
          mode={viewMode === 'freelancer' ? 'freelancers' : 'staff'}
        />
      </div>

      {/* Content */}
      <div className="space-y-6">
        {isMobile ? (
          <SalaryCardView
            data={combinedData}
            type="mixed"
            onPaySalary={handlePaySalary}
            onViewHistory={handleViewHistory}
            onAssignmentRates={handleAssignmentRates}
            onDetailedReport={handleViewDetailedReport}
            loading={false}
          />
        ) : (
          <SalaryTableView
            data={combinedData}
            type="mixed"
            onPaySalary={handlePaySalary}
            onViewHistory={handleViewHistory}
            onAssignmentRates={handleAssignmentRates}
            onDetailedReport={handleViewDetailedReport}
          />
        )}
      </div>

      {/* Dialogs */}
      {payDialogOpen && (
        <PaySalaryDialog
          open={payDialogOpen}
          onOpenChange={setPayDialogOpen}
          staff={selectedStaff}
          onSuccess={onPaymentSuccess}
        />
      )}

      {historyDialogOpen && (
        <SalaryHistoryDialog
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          staff={selectedStaff}
        />
      )}

      {assignmentDialogOpen && (
        <EventAssignmentRatesDialog
          open={assignmentDialogOpen}
          onOpenChange={setAssignmentDialogOpen}
          staff={selectedForAssignment}
          onSuccess={() => {
            refetchStaff();
            refetchFreelancers();
          }}
        />
      )}

      {detailedReportOpen && (
        <FreelancerDetailedReportDialog
          open={detailedReportOpen}
          onOpenChange={setDetailedReportOpen}
          freelancer={selectedForDetailedReport}
        />
      )}

      {staffDetailedReportOpen && (
        <StaffDetailedReportDialog
          open={staffDetailedReportOpen}
          onOpenChange={setStaffDetailedReportOpen}
          staff={selectedStaffForDetailedReport}
        />
      )}
    </>
  );
};

export default SalaryManagement;