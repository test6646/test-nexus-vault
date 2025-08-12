/**
 * Standardized Payment Calculation Utilities
 * Ensures data integrity across all payment operations
 */


import { parsePaymentMethod } from './payment-method-validator';

export interface PaymentData {
  amount: number;
  payment_method?: string;
}

export interface EventFinancials {
  total_amount: number;
  advance_amount?: number;
  balance_amount?: number;
  payments?: PaymentData[];
}

/**
 * Calculate accurate balance amount for an event
 */
export function calculateEventBalance(event: EventFinancials): number {
  const totalAmount = event.total_amount || 0;
  const totalPaid = calculateTotalPaid(event);
  const balance = Math.max(0, totalAmount - totalPaid);
  
  
  return balance;
}

/**
 * Calculate total amount paid for an event
 */
export function calculateTotalPaid(event: EventFinancials): number {
  if (event.payments && event.payments.length > 0) {
    return event.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  }
  return event.advance_amount || 0;
}

/**
 * Calculate advance amount for an event
 */
export function calculateAdvanceAmount(event: EventFinancials): number {
  return calculateTotalPaid(event);
}

/**
 * Validate payment amount against event constraints
 */
export function validatePaymentAmount(
  paymentAmount: number,
  event: EventFinancials
): { isValid: boolean; error?: string; maxAllowed?: number } {
  if (paymentAmount <= 0) {
    return {
      isValid: false,
      error: 'Payment amount must be greater than ₹0'
    };
  }

  const totalAmount = event.total_amount || 0;
  const currentPaid = calculateTotalPaid(event);
  const maxAllowed = Math.max(0, totalAmount - currentPaid);

  if (paymentAmount > maxAllowed) {
    return {
      isValid: false,
      error: `Payment amount (₹${paymentAmount.toLocaleString()}) cannot exceed remaining balance (₹${maxAllowed.toLocaleString()})`,
      maxAllowed
    };
  }

  return { isValid: true };
}

/**
 * Check if event is fully paid
 */
export function isEventFullyPaid(event: EventFinancials): boolean {
  return calculateEventBalance(event) <= 0;
}

/**
 * Get payment status for an event
 */
export function getPaymentStatus(event: EventFinancials): 'paid' | 'partial' | 'unpaid' {
  const balance = calculateEventBalance(event);
  const totalPaid = calculateTotalPaid(event);
  
  if (balance <= 0) return 'paid';
  if (totalPaid > 0) return 'partial';
  return 'unpaid';
}

/**
 * Calculate payment statistics for multiple events
 */
export function calculatePaymentStats(events: EventFinancials[]) {
  const stats = {
    totalEvents: events.length,
    totalRevenue: 0,
    totalPaid: 0,
    totalPending: 0,
    paidEvents: 0,
    partialEvents: 0,
    unpaidEvents: 0,
    cashPayments: 0,
    digitalPayments: 0
  };

  events.forEach(event => {
    const totalAmount = event.total_amount || 0;
    const totalPaid = calculateTotalPaid(event);
    const balance = calculateEventBalance(event);
    const status = getPaymentStatus(event);

    stats.totalRevenue += totalAmount;
    stats.totalPaid += totalPaid;
    stats.totalPending += balance;

    switch (status) {
      case 'paid':
        stats.paidEvents++;
        break;
      case 'partial':
        stats.partialEvents++;
        break;
      case 'unpaid':
        stats.unpaidEvents++;
        break;
    }

    // Calculate payment method stats
    if (event.payments) {
      event.payments.forEach(payment => {
        const method = parsePaymentMethod(payment.payment_method);
        if (method === 'Cash') {
          stats.cashPayments += payment.amount || 0;
        } else {
          stats.digitalPayments += payment.amount || 0;
        }
      });
    } else if (event.advance_amount && (event as any).advance_payment_method) {
      const method = parsePaymentMethod((event as any).advance_payment_method);
      if (method === 'Cash') {
        stats.cashPayments += event.advance_amount;
      } else {
        stats.digitalPayments += event.advance_amount;
      }
    }
  });

  return stats;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}