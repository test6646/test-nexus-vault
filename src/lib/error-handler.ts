// Centralized error handling utility
export const handleError = (error: any, context: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, error);
  }
  
  return {
    message: error?.message || 'An unexpected error occurred',
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

// Database error handler  
export const handleDatabaseError = (error: any, table: string, operation: string) => {
  if (error?.code === 'PGRST116') {
    return {
      message: 'No data found',
      table,
      operation
    };
  }
  
  if (error?.code === '23505') {
    return {
      message: 'This record already exists',
      table,
      operation
    };
  }
  
  return handleError(error, `${table} ${operation}`);
};