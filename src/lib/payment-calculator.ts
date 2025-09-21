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
  advance_payment_method?: string;
  balance_amount?: number;
  payments?: PaymentData[];
  event_closing_balances?: ClosingBalanceData[];
}

export interface ClosingBalanceData {
  id: string;
  closing_amount: number;
  closing_reason?: string;
}

/**
 * Calculate total closed amount for an event
 */
export function calculateTotalClosed(event: EventFinancials): number {
  const closingBalances = Array.isArray(event.event_closing_balances) ? event.event_closing_balances : [];
  return closingBalances.reduce((sum, closing) => sum + (closing.closing_amount || 0), 0);
}

/**
 * Calculate accurate balance amount for an event (excluding closed amounts)
 */
export function calculateEventBalance(event: EventFinancials): number {
  const totalAmount = event.total_amount || 0;
  const totalPaid = calculateTotalPaid(event);
  const totalClosed = calculateTotalClosed(event);
  const balance = Math.max(0, totalAmount - totalPaid - totalClosed);
  
  return balance;
}

/**
 * Calculate balance amount display info with closing amounts consideration
 */
export function calculateBalanceDisplayInfo(event: EventFinancials): {
  originalPending: number;
  effectivePending: number;
  totalClosed: number;
  isFullyClosed: boolean;
  isPartiallyClosed: boolean;
} {
  const totalAmount = event.total_amount || 0;
  const totalPaid = calculateTotalPaid(event);
  const totalClosed = calculateTotalClosed(event);
  const originalPending = Math.max(0, totalAmount - totalPaid);
  const effectivePending = Math.max(0, originalPending - totalClosed);
  
  return {
    originalPending,
    effectivePending,
    totalClosed,
    isFullyClosed: originalPending > 0 && effectivePending === 0,
    isPartiallyClosed: totalClosed > 0 && effectivePending > 0
  };
}

/**
 * Calculate total amount paid for an event
 * Includes advance_amount from event table + all payments from payments table
 */
export function calculateTotalPaid(event: EventFinancials): number {
  const advanceAmount = event.advance_amount || 0;
  const payments = Array.isArray(event.payments) ? event.payments : [];
  const paymentsAmount = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  
  return advanceAmount + paymentsAmount;
}

/**
 * Calculate advance amount for an event (from event table only)
 */
export function calculateAdvanceAmount(event: EventFinancials): number {
  return event.advance_amount || 0;
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
    totalClosed: 0,
    paidEvents: 0,
    partialEvents: 0,
    unpaidEvents: 0,
    cashPayments: 0,
    digitalPayments: 0
  };

  events.forEach(event => {
    const totalAmount = event.total_amount || 0;
    const totalPaid = calculateTotalPaid(event);
    const totalClosed = calculateTotalClosed(event);
    const balance = calculateEventBalance(event);
    const status = getPaymentStatus(event);

    stats.totalRevenue += totalAmount;
    stats.totalPaid += totalPaid;
    stats.totalClosed += totalClosed;
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

    // Calculate payment method stats from advance + payments table
    // Include advance payment method
    if (event.advance_amount && event.advance_amount > 0) {
      const advanceMethod = parsePaymentMethod(event.advance_payment_method);
      if (advanceMethod === 'Cash') {
        stats.cashPayments += event.advance_amount;
      } else {
        stats.digitalPayments += event.advance_amount;
      }
    }
    
    // Include payments from payments table
    const payments = Array.isArray(event.payments) ? event.payments : [];
    payments.forEach(payment => {
      const method = parsePaymentMethod(payment.payment_method);
      if (method === 'Cash') {
        stats.cashPayments += payment.amount || 0;
      } else {
        stats.digitalPayments += payment.amount || 0;
      }
    });
  });

  return stats;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}