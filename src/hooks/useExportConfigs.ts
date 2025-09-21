import { useMemo } from 'react';
import { generateExpenseReportPDF } from '@/components/expenses/ExpenseReportPDF';
import { generateTaskReportPDF } from '@/components/tasks/TaskReportPDF';
import { generateSalaryReportPDF } from '@/components/salary/SalaryReportPDF';
import { generateEventReportPDF } from '@/components/events/EventReportPDF';
import { useExportTotalCounts } from './useExportTotalCounts';

import { ExportConfig } from '@/components/common/UniversalExportDialog';
import { ExpenseCategory, TaskStatus } from '@/types/studio';

export const useExpenseExportConfig = (): ExportConfig => {
  const totalCounts = useExportTotalCounts();
  
  return useMemo(() => ({
    title: "Expense Report",
    filterTypes: [
      { value: 'global', label: 'All Expenses' },
      { 
        value: 'category', 
        label: 'By Category',
        options: [
          'Equipment', 'Travel', 'Accommodation', 'Food', 'Marketing', 
          'Software', 'Maintenance', 'Salary', 'Other'
        ].map(cat => ({ value: cat, label: cat }))
      }
    ],
    exportFunction: async (data, filterType, filterValue, firmData) => {
      await generateExpenseReportPDF(data, filterType, filterValue, firmData);
    },
    getPreviewData: (data) => ({
      count: totalCounts.loading ? data.length : totalCounts.expenses,
      summary: {
        'Total Amount': `₹${data.reduce((sum, expense) => sum + expense.amount, 0).toLocaleString()}`
      }
    })
  }), [totalCounts]);
};

export const useTaskExportConfig = (staffMembers: Array<{ id: string; full_name: string }>): ExportConfig => {
  const totalCounts = useExportTotalCounts();
  
  return useMemo(() => ({
    title: "Task Report",
    filterTypes: [
      { value: 'global', label: 'All Tasks' },
      { 
        value: 'staff', 
        label: 'By Staff Member',
        options: staffMembers.map(staff => ({ value: staff.id, label: staff.full_name }))
      },
      { 
        value: 'status', 
        label: 'By Status',
        options: ['Waiting for Response', 'Accepted', 'Declined', 'In Progress', 'Completed', 'Under Review', 'On Hold', 'Reported']
          .map(status => ({ value: status, label: status }))
      }
    ],
    exportFunction: async (data, filterType, filterValue, firmData) => {
      await generateTaskReportPDF(data, filterType, filterValue, firmData);
    },
    getPreviewData: (data) => ({
      count: totalCounts.loading ? data.length : totalCounts.tasks
    })
  }), [staffMembers, totalCounts]);
};

export const useEventExportConfig = (): ExportConfig => {
  const totalCounts = useExportTotalCounts();
  
  return useMemo(() => ({
    title: "Event Report",
    filterTypes: [
      { value: 'all', label: 'All Events' },
      { 
        value: 'event_type', 
        label: 'By Event Type',
        options: [
          { value: 'Ring-Ceremony', label: 'Ring Ceremony' },
          { value: 'Pre-Wedding', label: 'Pre-Wedding' },
          { value: 'Wedding', label: 'Wedding' },
          { value: 'Maternity Photography', label: 'Maternity Photography' },
          { value: 'Others', label: 'Others' }
        ]
      },
      { 
        value: 'status', 
        label: 'By Status',
        options: [
          { value: 'confirmed', label: 'Confirmed Events' },
          { value: 'completed', label: 'Completed Events' },
          { value: 'pending', label: 'Work Pending Events' },
          { value: 'crew_incomplete', label: 'Staff Incomplete Events' },
          { value: 'paid', label: 'Paid Events' },
          { value: 'payment_pending', label: 'Payment Due Events' }
        ]
      }
    ],
    exportFunction: async (data, filterType, filterValue) => {
      await generateEventReportPDF(data, filterType === 'all' ? undefined : 'status', filterValue);
    },
    getPreviewData: (data) => {
      const totalAmount = data.reduce((sum, event) => sum + (event.total_amount || 0), 0);
      const totalBalance = data.reduce((sum, event) => {
        const totalPaid = (event as any).payments?.reduce((s: number, p: any) => s + (p.amount || 0), 0) || 0;
        return sum + Math.max(0, (event.total_amount || 0) - totalPaid);
      }, 0);
      
      return {
        count: totalCounts.loading ? data.length : totalCounts.events,
        summary: {
          'Total Amount': `₹${totalAmount.toLocaleString()}`,
          'Amount Paid': `₹${(totalAmount - totalBalance).toLocaleString()}`,
          'Pending Balance': `₹${totalBalance.toLocaleString()}`
        }
      };
    }
  }), [totalCounts]);
};

export const useSalaryExportConfig = (staffData: any[], freelancerData: any[], totalStats: any): ExportConfig => {
  return useMemo(() => ({
    title: "Salary & Payment Report",
    filterTypes: [
      { value: 'all', label: 'Complete Report (Staff + Freelancers)' },
      { 
        value: 'staff', 
        label: 'Staff Salaries',
        options: [
          { value: 'all_staff', label: 'All Staff Members' },
          ...staffData.map(staff => ({ 
            value: staff.id, 
            label: staff.full_name 
          }))
        ]
      },
      { 
        value: 'freelancers', 
        label: 'Freelancer Payments',
        options: [
          { value: 'all_freelancers', label: 'All Freelancers' },
          ...(freelancerData && freelancerData.length > 0 ? freelancerData.map(freelancer => ({ 
            value: freelancer.id, 
            label: freelancer.full_name 
          })) : [])
        ]
      }
    ],
    exportFunction: async (data, filterType, filterValue) => {
      let filteredStaffData = staffData;
      let filteredFreelancerData = freelancerData;
      let reportType: 'staff' | 'freelancers' | 'all' = 'all';

      // Filter data based on the selected filter
      if (filterType === 'staff') {
        reportType = 'staff';
        filteredFreelancerData = []; // Don't include freelancers in staff report
        
        if (filterValue !== 'All Staff Members' && filterValue !== 'all_staff') {
          // Filter to specific staff member
          filteredStaffData = staffData.filter(staff => staff.full_name === filterValue || staff.id === filterValue);
        }
      } else if (filterType === 'freelancers') {
        reportType = 'freelancers';
        filteredStaffData = []; // Don't include staff in freelancer report
        
        if (filterValue !== 'All Freelancers' && filterValue !== 'all_freelancers') {
          // Filter to specific freelancer
          filteredFreelancerData = freelancerData.filter(freelancer => freelancer.full_name === filterValue || freelancer.id === filterValue);
        }
      }
      // If filterType is 'all', keep both arrays as they are

      await generateSalaryReportPDF(filteredStaffData, filteredFreelancerData, reportType, totalStats);
    },
    getPreviewData: (data, filterType, selectedValue) => {
      let summaryData;
      let count;
      
      switch (filterType) {
        case 'staff':
          if (selectedValue === 'all_staff' || selectedValue === 'All Staff Members') {
            summaryData = {
              'Total Earned': `₹${staffData.reduce((sum, s) => sum + s.total_earnings, 0).toLocaleString()}`,
              'Total Paid': `₹${staffData.reduce((sum, s) => sum + s.paid_amount, 0).toLocaleString()}`,
              'Pending': `₹${staffData.reduce((sum, s) => sum + s.pending_amount, 0).toLocaleString()}`
            };
            count = staffData.length;
          } else {
            const selectedStaff = staffData.find(s => s.full_name === selectedValue || s.id === selectedValue);
            if (selectedStaff) {
              summaryData = {
                'Total Earned': `₹${selectedStaff.total_earnings.toLocaleString()}`,
                'Total Paid': `₹${selectedStaff.paid_amount.toLocaleString()}`,
                'Pending': `₹${selectedStaff.pending_amount.toLocaleString()}`,
                'Total Tasks': selectedStaff.total_tasks.toString(),
                'Completed Tasks': selectedStaff.completed_tasks.toString()
              };
              count = 1;
            } else {
              summaryData = {};
              count = 0;
            }
          }
          break;
        case 'freelancers':
          if (selectedValue === 'all_freelancers' || selectedValue === 'All Freelancers') {
            summaryData = {
              'Total Earned': `₹${freelancerData.reduce((sum, f) => sum + f.total_earnings, 0).toLocaleString()}`,
              'Total Paid': `₹${freelancerData.reduce((sum, f) => sum + f.paid_amount, 0).toLocaleString()}`,
              'Pending': `₹${freelancerData.reduce((sum, f) => sum + f.pending_amount, 0).toLocaleString()}`
            };
            count = freelancerData.length;
          } else {
            const selectedFreelancer = freelancerData.find(f => f.full_name === selectedValue || f.id === selectedValue);
            if (selectedFreelancer) {
              summaryData = {
                'Total Earned': `₹${selectedFreelancer.total_earnings.toLocaleString()}`,
                'Total Paid': `₹${selectedFreelancer.paid_amount.toLocaleString()}`,
                'Pending': `₹${selectedFreelancer.pending_amount.toLocaleString()}`,
                'Total Assignments': selectedFreelancer.total_assignments.toString()
              };
              count = 1;
            } else {
              summaryData = {};
              count = 0;
            }
          }
          break;
        case 'all':
        default:
          summaryData = {
            'Total Earned': `₹${totalStats?.totalEarnings?.toLocaleString() || '0'}`,
            'Total Paid': `₹${totalStats?.totalPaid?.toLocaleString() || '0'}`,
            'Pending': `₹${totalStats?.totalPending?.toLocaleString() || '0'}`
          };
          count = staffData.length + freelancerData.length;
          break;
      }

      return {
        count,
        summary: summaryData
      };
    }
  }), [staffData, freelancerData, totalStats]);
};
