import { generateQuotationPDF } from './QuotationPDFRenderer';
import { saveAs } from 'file-saver';

export const downloadQuotationPDF = async (quotation: any) => {
  try {
    const result = await generateQuotationPDF(quotation);
    if (result.success) {
      const fileName = `Quotation-${quotation.title.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      saveAs(result.blob, fileName);
      return { success: true };
    } else {
      throw new Error('PDF generation failed');
    }
  } catch (error) {
    console.error('Error downloading PDF:', error);
    return { success: false, error };
  }
};