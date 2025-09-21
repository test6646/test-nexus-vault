import { useMemo } from 'react';
import { generateIndividualEventReport } from './IndividualEventReportPDF';
import { ExportConfig } from '@/components/common/UniversalExportDialog';

export const useEventExportConfig = (): ExportConfig => {
  return useMemo(() => ({
    title: "Event Report Export",
    filterTypes: [
      { value: 'individual', label: 'Individual Event Report' }
    ],
    exportFunction: async (data, filterType, filterValue) => {
      // For individual event export, just take the first one
      const event = Array.isArray(data) ? data[0] : data;
      if (event) {
        await generateIndividualEventReport(event);
      }
    },
    getPreviewData: (data) => {
      const events = Array.isArray(data) ? data : [data];
      const event = events[0];
      
      if (!event) {
        return {
          count: 0,
          summary: {}
        };
      }
      
      const totalAmount = event.total_amount || 0;
      const totalPaid = (event.payments || []).reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
      const balanceAmount = totalAmount - totalPaid;
      
      return {
        count: 1,
        summary: {
          'Event Title': event.title,
          'Event Type': event.event_type,
          'Total Amount': `₹${totalAmount.toLocaleString()}`,
          'Amount Paid': `₹${totalPaid.toLocaleString()}`,
          'Balance Due': `₹${balanceAmount.toLocaleString()}`,
          'Staff Assigned': (event.event_staff_assignments || []).length.toString(),
          'Tasks Created': (event.tasks || []).length.toString()
        }
      };
    }
  }), []);
};