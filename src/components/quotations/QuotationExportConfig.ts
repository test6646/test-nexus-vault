import { useMemo } from 'react';
import { generateQuotationPDF } from './QuotationPDFRenderer';
import { ExportConfig } from '@/components/common/UniversalExportDialog';
import { saveAs } from 'file-saver';

export const useQuotationExportConfig = (): ExportConfig => {
  return useMemo(() => ({
    title: "Quotation Export",
    filterTypes: [
      { value: 'all', label: 'All Quotations' },
      { 
        value: 'status', 
        label: 'By Status',
        options: [
          { value: 'pending', label: 'Pending Quotations' },
          { value: 'approved', label: 'Approved Quotations' },
          { value: 'rejected', label: 'Rejected Quotations' },
          { value: 'converted', label: 'Converted to Events' }
        ]
      },
      { 
        value: 'event_type', 
        label: 'By Event Type',
        options: [
          { value: 'Wedding', label: 'Wedding' },
          { value: 'Pre Wedding', label: 'Pre Wedding' },
          { value: 'Birthday', label: 'Birthday' },
          { value: 'Anniversary', label: 'Anniversary' },
          { value: 'Corporate', label: 'Corporate' },
          { value: 'Product', label: 'Product' },
          { value: 'Other', label: 'Other' }
        ]
      }
    ],
    exportFunction: async (data, filterType, filterValue) => {
      // For individual quotation export, just take the first one
      const quotation = Array.isArray(data) ? data[0] : data;
      if (quotation) {
        const result = await generateQuotationPDF(quotation);
        if (result.success) {
          const fileName = `Quotation-${quotation.title.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
          saveAs(result.blob, fileName);
        }
      }
    },
    getPreviewData: (data) => {
      const quotations = Array.isArray(data) ? data : [data];
      const totalAmount = quotations.reduce((sum, quotation) => sum + (quotation.amount || 0), 0);
      const finalAmount = quotations.reduce((sum, quotation) => {
        const discountAmount = quotation.discount_amount || 0;
        return sum + ((quotation.amount || 0) - discountAmount);
      }, 0);
      
      return {
        count: quotations.length,
        summary: {
          'Total Quote Value': `₹${totalAmount.toLocaleString()}`,
          'After Discounts': `₹${finalAmount.toLocaleString()}`,
          'Average Quote': `₹${quotations.length > 0 ? (totalAmount / quotations.length).toLocaleString() : '0'}`
        }
      };
    }
  }), []);
};