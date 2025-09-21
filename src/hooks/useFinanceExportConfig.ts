import { useMemo } from 'react';
import { generateFinancialReportPDF } from '@/components/common/pdf-generators/FinancialReportPDF';
import { ExportConfig } from '@/components/common/UniversalExportDialog';
import { useAccountingEntries } from '@/hooks/useAccountingEntries';

export const useFinanceExportConfig = (events: any[]): ExportConfig => {
  const { entries } = useAccountingEntries();

  return useMemo(() => ({
    title: "Financial Report",
    filterTypes: [
      { value: 'all', label: 'Complete Financial Report' },
      { 
        value: 'payment_type', 
        label: 'By Payment Type',
        options: [
          { value: 'cash', label: 'Cash Payments' },
          { value: 'digital', label: 'Digital Payments' }
        ]
      },
      { 
        value: 'status', 
        label: 'By Status',
        options: [
          { value: 'pending', label: 'Pending Amounts' },
          { value: 'closed', label: 'Closed Amounts' }
        ]
      },
      { 
        value: 'event', 
        label: 'By Event',
        options: events.map(event => ({ 
          value: event.id, 
          label: `${event.title} - ${new Date(event.event_date).toLocaleDateString()}` 
        }))
      }
    ],
    exportFunction: async (data, filterType, filterValue, firmData) => {
      // Include accounting entries that reflect to company in the financial report
      const companyAccountingEntries = entries.filter(entry => entry.reflect_to_company);
      const enrichedData = { ...data, accountingEntries: companyAccountingEntries };
      await generateFinancialReportPDF(enrichedData, filterType, filterValue, firmData);
    },
    getPreviewData: (data) => {
      const statsData = Array.isArray(data) ? data[0] : data;
      
      // Calculate additional revenue/expenses from accounting entries
      const companyAccountingEntries = entries.filter(entry => entry.reflect_to_company);
      const accountingCredits = companyAccountingEntries
        .filter(entry => entry.entry_type === 'Credit')
        .reduce((sum, entry) => sum + entry.amount, 0);
      const accountingDebits = companyAccountingEntries
        .filter(entry => entry.entry_type === 'Debit')
        .reduce((sum, entry) => sum + entry.amount, 0);
      
      const totalRevenue = (statsData?.totalRevenue || 0) + accountingCredits;
      const totalExpenses = (statsData?.totalExpenses || 0) + accountingDebits;
      
      return {
        count: 1,
        summary: {
          'Revenue': `₹${totalRevenue?.toLocaleString() || '0'}`,
          'Expenses': `₹${totalExpenses?.toLocaleString() || '0'}`,
          'Net Profit': `₹${(totalRevenue - totalExpenses)?.toLocaleString() || '0'}`,
          'Accounting Entries': `${companyAccountingEntries.length} company entries`
        }
      };
    }
  }), [events, entries]);
};