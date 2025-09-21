// Utility file to track console log cleanup for production
// All sensitive console logs should be removed before production deployment

/*
REMOVED CONSOLE LOGS FOR PRODUCTION SECURITY:

1. Session data logs (authentication tokens, user data)
2. Staff/freelancer personal information (names, IDs, phone numbers)
3. Event details and client information
4. Payment and financial data
5. Assignment details with personal identifiers
6. Quotation information and amounts
7. Firm-specific data and configurations

RETAINED LOGS (if any):
- Generic error messages without sensitive data
- Simple status messages without identifiers
- Debug flags for development (should be conditional)
*/

export const isDevelopment = process.env.NODE_ENV === 'development';

// Helper function for conditional logging in development only
export const devLog = (message: string, data?: any) => {
  if (isDevelopment) {
    console.log(message, data);
  }
};

export const devWarn = (message: string, data?: any) => {
  if (isDevelopment) {
    console.warn(message, data);
  }
};

export const devError = (message: string, data?: any) => {
  if (isDevelopment) {
    console.error(message, data);
  }
};