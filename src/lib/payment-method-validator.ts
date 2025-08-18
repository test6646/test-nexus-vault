/**
 * Standardized Payment Method Validation
 * Single source of truth for payment method handling
 */



// Centralized payment method types
export type PaymentMethod = 'Cash' | 'Digital';

// All supported payment methods
export const PAYMENT_METHODS: readonly PaymentMethod[] = ['Cash', 'Digital'] as const;

// Default payment method
export const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'Cash';

/**
 * Validate if a payment method is supported
 */
export function isValidPaymentMethod(method: string): method is PaymentMethod {
  return PAYMENT_METHODS.includes(method as PaymentMethod);
}

/**
 * Safely parse payment method with fallback
 */
export function parsePaymentMethod(method: unknown): PaymentMethod {
  if (typeof method === 'string' && isValidPaymentMethod(method)) {
    return method;
  }
  
  
  return DEFAULT_PAYMENT_METHOD;
}

/**
 * Get payment method display options for UI
 */
export function getPaymentMethodOptions(): Array<{ value: PaymentMethod; label: string }> {
  return PAYMENT_METHODS.map(method => ({
    value: method,
    label: method
  }));
}

/**
 * Validate payment method form input
 */
export function validatePaymentMethodInput(method: string): { isValid: boolean; error?: string } {
  if (!method || method.trim() === '') {
    return {
      isValid: false,
      error: 'Payment method is required'
    };
  }

  if (!isValidPaymentMethod(method)) {
    return {
      isValid: false,
      error: `Invalid payment method. Must be one of: ${PAYMENT_METHODS.join(', ')}`
    };
  }

  return { isValid: true };
}

/**
 * Format payment method for display
 */
export function formatPaymentMethod(method: PaymentMethod): string {
  return method;
}

/**
 * Get payment method icon
 */
export function getPaymentMethodIcon(method: PaymentMethod): string {
  switch (method) {
    case 'Cash':
      return '💵';
    case 'Digital':
      return '💳';
    default:
      return '💰';
  }
}

/**
 * Check if payment method requires reference number
 */
export function requiresReferenceNumber(method: PaymentMethod): boolean {
  return method === 'Digital';
}