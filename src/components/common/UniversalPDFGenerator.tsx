import { generateIndividualEventReport } from '@/components/events/IndividualEventReportPDF';
import { generateQuotationPDF } from '@/components/quotations/QuotationPDFRenderer';
import generateFinanceReportPDF from '@/components/finance/FinanceReportPDF';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from 'react-day-picker';

// PDF generators for each module
import { generateClientReportPDF } from './pdf-generators/ClientReportPDF';
import { generateQuotationReportPDF } from './pdf-generators/QuotationReportPDF';
import { generateEventReportPDF } from '@/components/events/EventReportPDF';
import { generateTaskReportPDF } from '@/components/tasks/TaskReportPDF';
import { generateSalaryReportPDF } from '@/components/salary/SalaryReportPDF';
import { generateExpenseReportPDF } from '@/components/expenses/ExpenseReportPDF';
import { generateFinancialReportPDF } from './pdf-generators/FinancialReportPDF';


export interface PDFGeneratorParams {
  module: string;
  pdfType: string;
  filters: Record<string, any>;
  dateRange?: DateRange;
  searchQuery?: string;
  firmId: string;
}

export class UniversalPDFGenerator {
  static async generatePDF(params: PDFGeneratorParams): Promise<void> {
    const { module, pdfType, filters, dateRange, searchQuery, firmId } = params;

    // Fetch data based on module and filters
    const data = await this.fetchData(module, filters, dateRange, searchQuery, firmId);

    // Route to appropriate PDF generator
    switch (module) {
      case 'clients':
        await this.generateClientPDF(pdfType, data, filters);
        break;
      case 'quotations':
        await this.generateQuotationPDF(pdfType, data, filters);
        break;
      case 'events':
        await this.generateEventPDF(pdfType, data, filters);
        break;
      case 'tasks':
        await this.generateTaskPDF(pdfType, data, filters);
        break;
      case 'salary':
        await this.generateSalaryPDF(pdfType, data, filters);
        break;
      case 'expenses':
        await this.generateExpensePDF(pdfType, data, filters);
        break;
      case 'finance':
        await this.generateFinancePDF(pdfType, data, filters, dateRange);
        break;
      case 'accounts':
        await this.generateAccountsPDF(pdfType, data, filters, dateRange);
        break;
      default:
        throw new Error(`Unknown module: ${module}`);
    }
  }

  private static async fetchData(
    module: string,
    filters: Record<string, any>,
    dateRange?: DateRange,
    searchQuery?: string,
    firmId?: string
  ): Promise<any[]> {
    const tableName = this.getTableName(module);
    
    // For PDF export, we need to get ALL data without any pagination limits
    // Create multiple queries with pagination to get all records safely
    let allData: any[] = [];
    let hasMore = true;
    let page = 0;
    const pageSize = 1000; // Use larger chunks for efficiency
    
    while (hasMore) {
      let query = (supabase as any).from(tableName).select(this.getSelectFields(module));

      // Add firm filter
      if (firmId) {
        query = query.eq('firm_id', firmId);
      }

      // Add search filter
      if (searchQuery && searchQuery.trim()) {
        const safeTerm = searchQuery.trim().replace(/[,(\)]/g, ' ');
        const searchFields = this.getSearchFields(module);
        const searchConditions = searchFields.map(field => `${field}.ilike.%${safeTerm}%`);
        if (searchConditions.length > 0) {
          query = query.or(searchConditions.join(','));
        }
      }

      // Add specific filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          query = this.applyFilter(query, module, key, value);
        }
      });

      // Add date range filter
      if (dateRange?.from && dateRange?.to) {
        const dateField = this.getDateField(module);
        query = query.gte(dateField, dateRange.from.toISOString().split('T')[0])
                    .lte(dateField, dateRange.to.toISOString().split('T')[0]);
      }

      // Add pagination for this chunk
      const from = page * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error } = await query;
      if (error) throw error;
      
      if (data && data.length > 0) {
        allData = [...allData, ...data];
        hasMore = data.length === pageSize; // If we got a full page, there might be more
        page++;
      } else {
        hasMore = false;
      }
      
      // Safety break to prevent infinite loops
      if (page > 100) { // Max 100k records (100 * 1000)
        console.warn('PDF export reached maximum page limit (100k records)');
        break;
      }
    }
    
    return allData;
  }

  private static getTableName(module: string): string {
    const tableMap: Record<string, string> = {
      clients: 'clients',
      quotations: 'quotations',
      events: 'events',
      tasks: 'tasks',
      salary: 'profiles',
      expenses: 'expenses',
      finance: 'payments',
      accounts: 'events'
    };
    return tableMap[module] || module;
  }

  private static getSelectFields(module: string): string {
    const fieldMap: Record<string, string> = {
      clients: '*',
      quotations: '*, client:clients(*)',
      events: '*, client:clients(*), payments(*), event_staff_assignments(*), tasks(*)',
      tasks: '*, assigned_to:profiles(*), freelancer:freelancers(*), event:events(*)',
      salary: '*, staff_payments(*), freelancer_payments(*)',
      expenses: '*',
      finance: '*, event:events(*)',
      accounts: '*, client:clients(*), payments(*), event_closing_balances(*)'
    };
    return fieldMap[module] || '*';
  }

  private static getSearchFields(module: string): string[] {
    const searchFieldMap: Record<string, string[]> = {
      clients: ['name', 'phone', 'email'],
      quotations: ['title', 'venue'],
      events: ['title', 'venue'],
      tasks: ['title', 'description'],
      salary: ['full_name'],
      expenses: ['description', 'category'],
      finance: ['reference_number', 'notes'],
      accounts: ['title', 'venue']
    };
    return searchFieldMap[module] || [];
  }

  private static getDateField(module: string): string {
    const dateFieldMap: Record<string, string> = {
      clients: 'created_at',
      quotations: 'event_date',
      events: 'event_date',
      tasks: 'created_at',
      salary: 'created_at',
      expenses: 'expense_date',
      finance: 'payment_date',
      accounts: 'event_date'
    };
    return dateFieldMap[module] || 'created_at';
  }

  private static applyFilter(query: any, module: string, filterKey: string, value: any): any {
    // Apply module-specific filters
    switch (module) {
      case 'events':
        return this.applyEventFilters(query, filterKey, value);
      case 'tasks':
        return this.applyTaskFilters(query, filterKey, value);
      case 'expenses':
        return this.applyExpenseFilters(query, filterKey, value);
      case 'finance':
        return this.applyFinanceFilters(query, filterKey, value);
      default:
        if (filterKey !== 'search' && filterKey !== 'date_range') {
          query = query.eq(filterKey, value);
        }
        return query;
    }
  }

  private static applyEventFilters(query: any, filterKey: string, value: any): any {
    switch (filterKey) {
      case 'staff_status':
        // This would need complex logic to check staff assignment completeness
        return query;
      case 'date_filter':
        const today = new Date().toISOString().split('T')[0];
        if (value === 'upcoming') {
          return query.gte('event_date', today);
        } else if (value === 'past') {
          return query.lt('event_date', today);
        }
        return query;
      case 'payment_status':
        // This would need complex logic to check payment status
        return query;
      case 'task_status':
        // This would need complex logic to check task status
        return query;
      default:
        return query;
    }
  }

  private static applyTaskFilters(query: any, filterKey: string, value: any): any {
    switch (filterKey) {
      case 'status':
        const statusMap: Record<string, string> = {
          completed: 'Completed',
          incomplete: 'Pending',
          in_progress: 'In Progress'
        };
        return query.eq('status', statusMap[value] || value);
      case 'assigned_member':
        if (value === 'staff') {
          return query.not('assigned_to', 'is', null);
        } else if (value === 'freelancer') {
          return query.not('freelancer_id', 'is', null);
        }
        return query;
      default:
        return query;
    }
  }

  private static applyExpenseFilters(query: any, filterKey: string, value: any): any {
    switch (filterKey) {
      case 'category':
        return query.eq('category', value);
      case 'event_filter':
        return query.eq('event_id', value);
      default:
        return query;
    }
  }

  private static applyFinanceFilters(query: any, filterKey: string, value: any): any {
    switch (filterKey) {
      case 'payment_type':
        if (value === 'cash') {
          return query.eq('payment_method', 'Cash');
        } else if (value === 'digital') {
          return query.neq('payment_method', 'Cash');
        }
        return query;
      case 'event_filter':
        return query.eq('event_id', value);
      default:
        return query;
    }
  }

  // PDF Generation Methods for each module
  private static async generateClientPDF(pdfType: string, data: any[], filters: Record<string, any>): Promise<void> {
    switch (pdfType) {
      case 'all_clients':
        await generateClientReportPDF(data, 'all', 'all');
        break;
      case 'event_wise_clients':
        await generateClientReportPDF(data, 'event', filters.event_filter || 'all');
        break;
      default:
        throw new Error(`Unknown client PDF type: ${pdfType}`);
    }
  }

  private static async generateQuotationPDF(pdfType: string, data: any[], filters: Record<string, any>): Promise<void> {
    switch (pdfType) {
      case 'all_quotations':
        await generateQuotationReportPDF(data, 'all', 'all');
        break;
      case 'upcoming_quotations':
        await generateQuotationReportPDF(data, 'upcoming', 'upcoming');
        break;
      case 'event_wise_quotations':
        await generateQuotationReportPDF(data, 'event', filters.event_filter || 'all');
        break;
      default:
        throw new Error(`Unknown quotation PDF type: ${pdfType}`);
    }
  }

  private static async generateEventPDF(pdfType: string, data: any[], filters: Record<string, any>): Promise<void> {
    switch (pdfType) {
      case 'all_events':
        await generateEventReportPDF(data, 'all', 'all');
        break;
      case 'staff_incomplete':
        await generateEventReportPDF(data, 'staff_status', 'incomplete');
        break;
      case 'upcoming_events':
        await generateEventReportPDF(data, 'date', 'upcoming');
        break;
      case 'completed_events':
        await generateEventReportPDF(data, 'date', 'completed');
        break;
      case 'pending_payments':
        await generateEventReportPDF(data, 'payment_status', 'pending');
        break;
      case 'pending_tasks':
        await generateEventReportPDF(data, 'task_status', 'pending');
        break;
      case 'custom_range':
        await generateEventReportPDF(data, 'date_range', 'custom');
        break;
      case 'individual_event':
        if (data.length > 0) {
          await generateIndividualEventReport(data[0]);
        }
        break;
      default:
        throw new Error(`Unknown event PDF type: ${pdfType}`);
    }
  }

  private static async generateTaskPDF(pdfType: string, data: any[], filters: Record<string, any>): Promise<void> {
    switch (pdfType) {
      case 'all_tasks':
        await generateTaskReportPDF(data, 'all', 'all');
        break;
      case 'task_status':
        await generateTaskReportPDF(data, 'status', filters.status || 'all');
        break;
      case 'member_wise':
        await generateTaskReportPDF(data, 'member', filters.assigned_member || 'all');
        break;
      case 'retasked':
        await generateTaskReportPDF(data, 'retasked', 'retasked');
        break;
      case 'staff_vs_freelancer':
        await generateTaskReportPDF(data, 'comparison', 'staff_vs_freelancer');
        break;
      default:
        throw new Error(`Unknown task PDF type: ${pdfType}`);
    }
  }

  private static async generateSalaryPDF(pdfType: string, data: any[], filters: Record<string, any>): Promise<void> {
    switch (pdfType) {
      case 'all_freelancers':
        const reportType1 = 'freelancers';
        await generateSalaryReportPDF(data, [], reportType1 as any, {});
        break;
      case 'all_staff':
        const reportType2 = 'staff';
        await generateSalaryReportPDF(data, [], reportType2 as any, {});
        break;
      case 'individual_member':
        const reportType3 = 'all';
        await generateSalaryReportPDF(data, [], reportType3 as any, {});
        break;
      case 'role_wise':
        const reportType4 = filters.role || 'all';
        await generateSalaryReportPDF(data, [], reportType4 as any, {});
        break;
      case 'paid_salary':
        const reportType5 = 'all';
        await generateSalaryReportPDF(data, [], reportType5 as any, {});
        break;
      case 'unpaid_salary':
        const reportType6 = 'all';
        await generateSalaryReportPDF(data, [], reportType6 as any, {});
        break;
      case 'pending_salary':
        const reportType7 = 'all';
        await generateSalaryReportPDF(data, [], reportType7 as any, {});
        break;
      case 'salary_linked_tasks':
        const reportType8 = 'all';
        await generateSalaryReportPDF(data, [], reportType8 as any, {});
        break;
      default:
        throw new Error(`Unknown salary PDF type: ${pdfType}`);
    }
  }

  private static async generateExpensePDF(pdfType: string, data: any[], filters: Record<string, any>): Promise<void> {
    switch (pdfType) {
      case 'all_expenses':
        await generateExpenseReportPDF(data, 'all', 'all');
        break;
      case 'category_wise':
        await generateExpenseReportPDF(data, 'category', filters.category || 'all');
        break;
      case 'event_wise':
        await generateExpenseReportPDF(data, 'event', filters.event_filter || 'all');
        break;
      case 'monthly':
        await generateExpenseReportPDF(data, 'monthly', 'monthly');
        break;
      case 'yearly':
        await generateExpenseReportPDF(data, 'yearly', 'yearly');
        break;
      default:
        throw new Error(`Unknown expense PDF type: ${pdfType}`);
    }
  }

  private static async generateFinancePDF(pdfType: string, data: any[], filters: Record<string, any>, dateRange?: DateRange): Promise<void> {
    switch (pdfType) {
      case 'all_payments':
        await generateFinancialReportPDF(data, 'all_payments', 'all');
        break;
      case 'cash_in':
        await generateFinancialReportPDF(data, 'cash_in', 'cash');
        break;
      case 'digital_payments':
        await generateFinancialReportPDF(data, 'digital_payments', 'digital');
        break;
      case 'pending_amounts':
        await generateFinancialReportPDF(data, 'pending_amounts', 'pending');
        break;
      case 'closed_amounts':
        await generateFinancialReportPDF(data, 'closed_amounts', 'closed');
        break;
      case 'revenue_report':
        await generateFinancialReportPDF(data, 'revenue_report', 'revenue');
        break;
      case 'profit_loss':
        await generateFinancialReportPDF(data, 'profit_loss', 'profit_loss');
        break;
      case 'full_financial':
        await generateFinancialReportPDF(data, 'full_financial', 'comprehensive');
        break;
      default:
        throw new Error(`Unknown finance PDF type: ${pdfType}`);
    }
  }

  private static async generateAccountsPDF(pdfType: string, data: any[], filters: Record<string, any>, dateRange?: DateRange): Promise<void> {
    const { generateBalanceSheetPDF } = await import('./pdf-generators/AdvancedBalanceSheetPDF');
    const { generateCashFlowPDF } = await import('./pdf-generators/CashFlowPDF');
    const { generateProfitLossPDF } = await import('./pdf-generators/ProfitLossPDF');

    switch (pdfType) {
      case 'balance_sheet':
        await generateBalanceSheetPDF();
        break;
      case 'cash_flow':
        await generateCashFlowPDF();
        break;
      case 'profit_loss':
        await generateProfitLossPDF();
        break;
      case 'trial_balance':
        await generateBalanceSheetPDF(); // Use balance sheet for now
        break;
      default:
        await generateBalanceSheetPDF(); // Default to balance sheet
    }
  }

}

export default UniversalPDFGenerator;