import { CentralizedErrorHandler, handleDatabaseError as centralizedDbHandler, handleAPIError } from './centralized-error-handler';

// Legacy compatibility - redirect to centralized handler
export const handleError = (error: any, context: string) => {
  const handler = CentralizedErrorHandler.getInstance();
  const errorResponse = handler.handleError(error, { component: context });
  
  
  return {
    message: errorResponse.userMessage,
    context
  };
};

// Network error handler
export const handleNetworkError = (error: any, operation: string) => {
  if (error?.message?.includes('fetch')) {
    return {
      message: 'Network connection error. Please check your internet connection.',
      operation
    };
  }
  
  return handleError(error, operation);
};

// Database error handler - enhanced with centralized handling
export const handleDatabaseError = (error: any, table: string, operation: string) => {
  return centralizedDbHandler(error, table, operation);
};