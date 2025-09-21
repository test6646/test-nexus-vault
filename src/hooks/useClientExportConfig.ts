import { useMemo } from 'react';
import { generateClientReportPDF } from '@/components/common/pdf-generators/ClientReportPDF';
import { useExportTotalCounts } from './useExportTotalCounts';
import { ExportConfig } from '@/components/common/UniversalExportDialog';

export const useClientExportConfig = (events: any[]): ExportConfig => {
  const totalCounts = useExportTotalCounts();
  
  return useMemo(() => ({
    title: "Client Report",
    filterTypes: [
      { value: 'all', label: 'All Clients' },
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
      await generateClientReportPDF(data, filterType, filterValue, firmData);
    },
    getPreviewData: (data) => ({
      count: totalCounts.loading ? data.length : totalCounts.clients,
      summary: {
        'Total Clients': (totalCounts.loading ? data.length : totalCounts.clients).toString(),
        'With Phone Numbers': data.filter((client: any) => client.phone).length.toString(),
        'With Email': data.filter((client: any) => client.email).length.toString()
      }
    })
  }), [events, totalCounts]);
};