/**
 * Shared Google Authentication Utilities
 * Provides centralized, reliable Google API authentication with proper error handling and retry logic
 */

interface GoogleAuthConfig {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

const DEFAULT_CONFIG: GoogleAuthConfig = {
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000 // 1 second
};

/**
 * Get Google API access token with comprehensive error handling and retries
 */
export async function getGoogleAccessToken(config: GoogleAuthConfig = {}): Promise<string> {
  const { timeout, maxRetries, retryDelay } = { ...DEFAULT_CONFIG, ...config };
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries!; attempt++) {
    try {
      
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Google Auth timeout after ${timeout}ms`)), timeout);
      });
      
      // Create auth promise
      const authPromise = performGoogleAuth();
      
      // Race between timeout and auth
      const token = await Promise.race([authPromise, timeoutPromise]);
      
      return token;
      
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on final attempt
      if (attempt === maxRetries) break;
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, retryDelay! * attempt));
    }
  }
  
  throw new Error(`Google Auth failed after ${maxRetries} attempts. Last error: ${lastError!.message}`);
}

/**
 * Core Google authentication logic
 */
async function performGoogleAuth(): Promise<string> {
  const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
  if (!serviceAccountJson) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable not set');
  }
  
  let serviceAccount: any;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (error) {
    throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON format');
  }
  
  // Validate required fields
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('Missing required fields in Google service account JSON');
  }
  
  // Create JWT for Google API authentication
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };
  
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  const payloadB64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  const signatureInput = `${headerB64}.${payloadB64}`;
  
  // Import and process private key
  const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = privateKey
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '');
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const keyData = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    keyData,
    encoder.encode(signatureInput)
  );
  
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  const jwt = `${headerB64}.${payloadB64}.${signatureB64}`;
  
  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  
  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorText}`);
  }
  
  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error('No access token received from Google');
  }
  
  return tokenData.access_token;
}

/**
 * Validate Google API response and handle common errors
 */
export function validateGoogleResponse(response: Response, operation: string) {
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(`Google API authentication failed for ${operation}`);
    } else if (response.status === 403) {
      throw new Error(`Google API access forbidden for ${operation}. Check permissions.`);
    } else if (response.status === 404) {
      throw new Error(`Google API resource not found for ${operation}. Check spreadsheet ID.`);
    } else if (response.status >= 500) {
      throw new Error(`Google API server error for ${operation}. Status: ${response.status}`);
    } else {
      throw new Error(`Google API error for ${operation}. Status: ${response.status}`);
    }
  }
}