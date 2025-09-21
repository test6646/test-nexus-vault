/**
 * Enterprise-Grade Centralized Error Handler
 * Provides comprehensive error handling, logging, and user feedback
 */

export interface ErrorContext {
  component?: string;
  operation?: string;
  userId?: string;
  firmId?: string;
  metadata?: Record<string, any>;
}

export interface ErrorResponse {
  message: string;
  code?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  shouldRetry: boolean;
  userMessage: string;
}

export class CentralizedErrorHandler {
  private static instance: CentralizedErrorHandler;
  private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'error';

  static getInstance(): CentralizedErrorHandler {
    if (!CentralizedErrorHandler.instance) {
      CentralizedErrorHandler.instance = new CentralizedErrorHandler();
    }
    return CentralizedErrorHandler.instance;
  }

  /**
   * Handle and categorize errors with appropriate responses
   */
  handleError(error: any, context: ErrorContext = {}): ErrorResponse {
    const errorInfo = this.categorizeError(error);
    const logData = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      severity: errorInfo.severity,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
    };

    // Log based on severity
    this.logError(logData, errorInfo.severity);

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(logData);
    }

    return {
      ...errorInfo,
      message: error.message
    };
  }

  /**
   * Categorize errors by type and severity
   */
  private categorizeError(error: any): Omit<ErrorResponse, 'message'> {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code || error.status;

    // Network errors
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorCode >= 500) {
      return {
        code: 'NETWORK_ERROR',
        severity: 'high',
        shouldRetry: true,
        userMessage: 'Connection issue detected. Please check your internet and try again.'
      };
    }

    // Authentication errors
    if (errorMessage.includes('unauthorized') || errorMessage.includes('jwt') || errorCode === 401) {
      return {
        code: 'AUTH_ERROR',
        severity: 'medium',
        shouldRetry: false,
        userMessage: 'Please log in again to continue.'
      };
    }

    // Permission errors
    if (errorMessage.includes('forbidden') || errorCode === 403) {
      return {
        code: 'PERMISSION_ERROR',
        severity: 'medium',
        shouldRetry: false,
        userMessage: 'You do not have permission to perform this action.'
      };
    }

    // Validation errors
    if (errorMessage.includes('validation') || errorMessage.includes('invalid') || errorCode === 400) {
      return {
        code: 'VALIDATION_ERROR',
        severity: 'low',
        shouldRetry: false,
        userMessage: 'Please check your input and try again.'
      };
    }

    // Database/RLS errors
    if (errorMessage.includes('rls') || errorMessage.includes('row level security')) {
      return {
        code: 'DATABASE_SECURITY_ERROR',
        severity: 'critical',
        shouldRetry: false,
        userMessage: 'Access denied. Please contact support if this persists.'
      };
    }


    // Default case
    return {
      code: 'UNKNOWN_ERROR',
      severity: 'medium',
      shouldRetry: false,
      userMessage: 'An unexpected error occurred. Please try again or contact support.'
    };
  }

  /**
   * Log errors with appropriate levels
   */
  private logError(logData: any, severity: string): void {
    const logMessage = `[${severity.toUpperCase()}] ${logData.context.component || 'Unknown'}: ${logData.error.message}`;
    
    switch (severity) {
      case 'critical':
        console.error('🚨 CRITICAL ERROR:', logData);
        break;
      case 'high':
        console.error('❌ HIGH SEVERITY:', logData);
        break;
      case 'medium':
        console.warn('⚠️ WARNING:', logMessage);
        break;
      case 'low':
        if (this.logLevel === 'debug') {
          console.info('ℹ️ INFO:', logMessage);
        }
        break;
    }
  }

  /**
   * Send critical errors to monitoring service
   */
  private sendToMonitoring(logData: any): void {
    // In production, integrate with monitoring services like Sentry, DataDog, etc.
    if (logData.severity === 'critical' || logData.severity === 'high') {
      // Example: Sentry.captureException(error, { contexts: { custom: logData } });
    }
  }

  /**
   * Handle promise rejections globally
   */
  static setupGlobalErrorHandling(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        const handler = CentralizedErrorHandler.getInstance();
        handler.handleError(event.reason, { component: 'Global', operation: 'unhandledrejection' });
      });

      window.addEventListener('error', (event) => {
        const handler = CentralizedErrorHandler.getInstance();
        handler.handleError(event.error, { component: 'Global', operation: 'global_error' });
      });
    }
  }
}

// Convenience functions for common use cases
export const handleDatabaseError = (error: any, table: string, operation: string) => {
  return CentralizedErrorHandler.getInstance().handleError(error, {
    component: 'Database',
    operation: `${table}_${operation}`
  });
};

export const handleAPIError = (error: any, endpoint: string, method: string) => {
  return CentralizedErrorHandler.getInstance().handleError(error, {
    component: 'API',
    operation: `${method}_${endpoint}`
  });
};
