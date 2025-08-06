/**
 * Production Cleanup Utilities
 * Removes development code and enables production optimizations
 */

export class ProductionCleanup {
  /**
   * Remove all console logging in production
   */
  static removeConsoleLogging(): void {
    if (process.env.NODE_ENV === 'production') {
      // Override console methods to no-op in production
      console.log = () => {};
      console.warn = () => {};
      console.error = () => {};
      console.info = () => {};
      console.debug = () => {};
    }
  }

  /**
   * Initialize production-ready configuration
   */
  static initializeProduction(): void {
    // Remove console logging
    this.removeConsoleLogging();

    // Enable strict mode checks
    if (typeof window !== 'undefined') {
      // Disable React Developer Tools in production
      if (process.env.NODE_ENV === 'production') {
        const globalThis = window as any;
        if (typeof globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ === 'object') {
          globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = null;
          globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberUnmount = null;
        }
      }
    }
  }

  /**
   * Security headers for production deployment
   */
  static getSecurityHeaders(): Record<string, string> {
    return {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://tovnbcputrcfznsnccef.supabase.co wss://tovnbcputrcfznsnccef.supabase.co",
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; ')
    };
  }
}