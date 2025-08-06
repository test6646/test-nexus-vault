/**
 * Enterprise Security Headers and Configuration
 * Implements security best practices for production deployment
 */

export const SECURITY_HEADERS = {
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "media-src 'self' https: blob:",
    `connect-src 'self' https://tovnbcputrcfznsnccef.supabase.co wss://tovnbcputrcfznsnccef.supabase.co ${typeof window !== 'undefined' ? window.location.origin : 'https://lovable.app'}`,
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; '),

  // Additional security headers
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()'
  ].join(', '),
  
  // HTTPS enforcement
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Cache control for sensitive data
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Pragma': 'no-cache',
  'Expires': '0'
};

export const RATE_LIMIT_CONFIG = {
  // API endpoints rate limiting
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
  },
  
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 login attempts per windowMs
    message: 'Too many login attempts, please try again later.'
  },
  
};

export const SECURITY_CONFIG = {
  // Session configuration
  session: {
    secure: true, // HTTPS only
    httpOnly: true, // No client-side access
    sameSite: 'strict' as const,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  // CORS configuration
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://lovable.app', 'https://*.lovable.app'] // Lovable deployment domains
      : ['http://localhost:3000', 'http://localhost:8080'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  },
  
  // Input validation
  validation: {
    maxRequestSize: '10mb',
    parameterLimit: 1000,
    arrayLimit: 100
  }
};

// Client-side security utilities
export const SecurityUtils = {
  /**
   * Sanitize user input to prevent XSS
   */
  sanitizeInput: (input: string): string => {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  },

  /**
   * Validate email format
   */
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },

  /**
   * Validate phone number format
   */
  isValidPhone: (phone: string): boolean => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  },

  /**
   * Check if URL is safe for redirection
   */
  isSafeUrl: (url: string): boolean => {
    try {
      const urlObj = new URL(url, window.location.origin);
      return urlObj.origin === window.location.origin;
    } catch {
      return false;
    }
  },

  /**
   * Generate secure random token
   */
  generateSecureToken: (length: number = 32): string => {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Hash sensitive data for logging
   */
  hashForLogging: async (data: string): Promise<string> => {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 8);
  }
};

// Environment-specific security checks
export const SecurityChecks = {
  /**
   * Verify production security requirements
   */
  checkProductionSecurity: (): { passed: boolean; issues: string[] } => {
    const issues: string[] = [];

    // Check HTTPS
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:') {
      issues.push('Application must be served over HTTPS in production');
    }

    // Check secure headers
    if (typeof document !== 'undefined') {
      const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (!meta) {
        issues.push('Content Security Policy header is missing');
      }
    }

    // Check for debug code
    if (process.env.NODE_ENV === 'production') {
      if (typeof console !== 'undefined' && console.log.toString().indexOf('native code') === -1) {
        issues.push('Console methods should be removed in production');
      }
    }

    return {
      passed: issues.length === 0,
      issues
    };
  },

  /**
   * Verify authentication security
   */
  checkAuthSecurity: (): { passed: boolean; issues: string[] } => {
    const issues: string[] = [];

    // Check localStorage for sensitive data
    if (typeof localStorage !== 'undefined') {
      try {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key.toLowerCase().includes('password') || key.toLowerCase().includes('secret')) {
            issues.push(`Potentially sensitive data in localStorage: ${key}`);
          }
        }
      } catch (e) {
        // Storage not accessible
      }
    }

    return {
      passed: issues.length === 0,
      issues
    };
  }
};