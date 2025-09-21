import { useMemo } from 'react';
import { generateQuotationReportPDF } from '@/components/common/pdf-generators/QuotationReportPDF';
import { useExportTotalCounts } from './useExportTotalCounts';
import { ExportConfig } from '@/components/common/UniversalExportDialog';

export const useQuotationExportConfig = (events: any[]): ExportConfig => {
  const totalCounts = useExportTotalCounts();
  
  return useMemo(() => ({
    title: "Quotation Report",
    filterTypes: [
      { value: 'all', label: 'All Quotations' },
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
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'past', label: 'Past' },
          { value: 'converted', label: 'Converted to Event' },
          { value: 'pending', label: 'Pending' }
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
      await generateQuotationReportPDF(data, filterType, filterValue, firmData);
    },
    getPreviewData: (data) => {
      const totalAmount = data.reduce((sum, quotation) => sum + (quotation.amount || 0), 0);
      const convertedCount = data.filter((q: any) => q.converted_to_event).length;
      
      return {
        count: totalCounts.loading ? data.length : totalCounts.quotations,
        summary: {
          'Total Amount': `₹${totalAmount.toLocaleString()}`,
          'Converted to Events': convertedCount.toString(),
          'Pending Quotations': (data.length - convertedCount).toString()
        }
      };
    }
  }), [events, totalCounts]);
};