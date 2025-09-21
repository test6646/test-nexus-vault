import React from 'react';
import StatCard from '@/components/ui/stat-card';
import { useGlobalSalaryStats } from '@/hooks/useGlobalSalaryStats';
import { 
  MoneyBag02Icon, 
  DollarCircleIcon, 
  UserIcon, 
  ChartBarLineIcon,
  Alert01Icon,
  Calendar01Icon
} from 'hugeicons-react';

interface SalaryStatsProps {
  stats: {
    totalStaff: number;
    totalFreelancers: number;
    taskPaymentsTotal: number;
    assignmentRatesTotal: number;
    totalPaid: number;
    totalPending: number;
    avgPerPerson: number;
    totalEarnings: number;
  } | null;
  loading: boolean;
  mode: 'staff' | 'freelancers' | 'mix';
}

const SalaryStats = ({ stats: _ignoredStats, loading: _ignoredLoading, mode }: SalaryStatsProps) => {
  // Use global salary stats hook to decouple from heavy datasets
  const { staffPayments, freelancerPayments, tasks, assignmentRates, totalStaffCount, totalFreelancerCount, loading } = useGlobalSalaryStats();

  if (loading) {
    return (
      <div className="flex gap-1 sm:gap-3 md:gap-4 w-full">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-1 h-[80px] sm:h-[150px] flex flex-col items-center justify-center bg-card border-2 border-primary/30 rounded-full shadow-sm animate-pulse">
            <div className="flex flex-col items-center justify-center space-y-0 p-1 sm:pb-1 md:pb-1 sm:px-2 md:px-3 sm:pt-1 md:pt-2">
              <div className="hidden sm:block p-1 md:p-2 rounded-full bg-primary/10 mb-1 md:mb-1">
                <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded-full bg-gray-300 animate-pulse" />
              </div>
              <div className="h-2 sm:h-3 md:h-4 w-12 sm:w-16 md:w-20 rounded bg-gray-300 animate-pulse" />
            </div>
            <div className="flex items-center justify-center pt-0 pb-1 sm:pb-1 md:pb-2 px-1 sm:px-2 md:px-3">
              <div className="h-3 sm:h-4 md:h-6 w-6 sm:w-8 md:w-12 rounded bg-gray-300 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Compute earnings and payments by mode
  const staffTaskEarnings = tasks
    .filter(t => t.assigned_to && t.status === 'Completed')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const freelancerTaskEarnings = tasks
    .filter(t => t.freelancer_id && t.status === 'Completed')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const staffAssignEarnings = assignmentRates
    .filter(a => a.staff_id)
    .reduce((sum, a) => sum + ((Number(a.rate) || 0) * (Number(a.quantity) || 0)), 0);

  const freelancerAssignEarnings = assignmentRates
    .filter(a => a.freelancer_id)
    .reduce((sum, a) => sum + ((Number(a.rate) || 0) * (Number(a.quantity) || 0)), 0);

  const staffPaid = staffPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const freelancerPaid = freelancerPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const staffEarnings = staffTaskEarnings + staffAssignEarnings;
  const freelancerEarnings = freelancerTaskEarnings + freelancerAssignEarnings;

  const mixEarnings = staffEarnings + freelancerEarnings;
  const mixPaid = staffPaid + freelancerPaid;
  const mixPending = Math.max(0, mixEarnings - mixPaid);

  const computed = mode === 'staff'
    ? {
        totalStaff: totalStaffCount,
        totalFreelancers: 0,
        taskPaymentsTotal: staffTaskEarnings,
        assignmentRatesTotal: staffAssignEarnings,
        totalPaid: staffPaid,
        totalPending: Math.max(0, staffEarnings - staffPaid),
        avgPerPerson: totalStaffCount > 0 ? staffEarnings / totalStaffCount : 0,
        totalEarnings: staffEarnings,
      }
    : mode === 'freelancers'
    ? {
        totalStaff: 0,
        totalFreelancers: totalFreelancerCount,
        taskPaymentsTotal: freelancerTaskEarnings,
        assignmentRatesTotal: freelancerAssignEarnings,
        totalPaid: freelancerPaid,
        totalPending: Math.max(0, freelancerEarnings - freelancerPaid),
        avgPerPerson: totalFreelancerCount > 0 ? freelancerEarnings / totalFreelancerCount : 0,
        totalEarnings: freelancerEarnings,
      }
    : {
        totalStaff: totalStaffCount,
        totalFreelancers: totalFreelancerCount,
        taskPaymentsTotal: staffTaskEarnings + freelancerTaskEarnings,
        assignmentRatesTotal: staffAssignEarnings + freelancerAssignEarnings,
        totalPaid: mixPaid,
        totalPending: mixPending,
        avgPerPerson: (totalStaffCount + totalFreelancerCount) > 0 ? mixEarnings / (totalStaffCount + totalFreelancerCount) : 0,
        totalEarnings: mixEarnings,
      };

  return (
    <div className="flex gap-1 sm:gap-3 md:gap-4 w-full">
      <StatCard
        title="Total Earnings"
        value={`₹${(computed.totalEarnings || 0).toLocaleString()}`}
        icon={<MoneyBag02Icon className="h-4 w-4" />}
        colorClass="bg-primary/20 text-primary"
      />
      <StatCard
        title="Total Paid"
        value={`₹${(computed.totalPaid || 0).toLocaleString()}`}
        icon={<Calendar01Icon className="h-4 w-4" />}
        colorClass="bg-primary/20 text-primary"
      />
      <StatCard
        title="Payments"
        value={`₹${((computed.taskPaymentsTotal || 0) + (computed.assignmentRatesTotal || 0)).toLocaleString()}`}
        icon={<DollarCircleIcon className="h-4 w-4" />}
        colorClass="bg-primary/20 text-primary"
      />
      <StatCard
        title="Total Pending"
        value={`₹${(computed.totalPending || 0).toLocaleString()}`}
        icon={<Alert01Icon className="h-4 w-4" />}
        colorClass="bg-primary/20 text-primary"
      />
    </div>
  );
};

export default SalaryStats;