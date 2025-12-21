import crypto from 'crypto';

// CSRF token secret (MUST be set in environment variable)
const CSRF_SECRET = process.env.CSRF_SECRET;
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Fallback for development only (should never be used in production)
const DEFAULT_CSRF_SECRET = 'default-csrf-secret-change-in-production';

/**
 * Get effective CSRF secret, with validation
 * @returns {string} CSRF secret
 * @throws {Error} If CSRF_SECRET is not set in production
 */
function getEffectiveSecret() {
  if (!CSRF_SECRET) {
    // In production, this should never happen - throw error
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CSRF_SECRET environment variable is required in production');
    }
    // In development, use a warning but allow (for local testing)
    console.warn('⚠️ WARNING: CSRF_SECRET not set. Using default (INSECURE for production).');
    return DEFAULT_CSRF_SECRET;
  }
  return CSRF_SECRET;
}

/**
 * Generate a new CSRF token (signed with HMAC, no storage needed)
 * @param {string} sessionId - Unique session identifier (e.g., admin token)
 * @returns {string} CSRF token
 */
export function generateCSRFToken(sessionId) {
  const secret = getEffectiveSecret();
  const timestamp = Date.now();
  const data = `${sessionId}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  const signature = hmac.digest('hex');
  // Return token as base64 encoded: data.signature
  const token = Buffer.from(`${data}.${signature}`).toString('base64');
  return token;
}

/**
 * Verify CSRF token (using HMAC signature, no storage needed)
 * @param {string} token - CSRF token from request
 * @param {string} sessionId - Session identifier (e.g., admin token)
 * @returns {boolean} True if token is valid
 */
export function verifyCSRFToken(token, sessionId) {
  if (!token || !sessionId) {
    return false;
  }

  try {
    // Decode token
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [data, signature] = decoded.split('.');
    
    if (!data || !signature) {
      return false;
    }

    // Verify signature
    const secret = getEffectiveSecret();
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(data);
    const expectedSignature = hmac.digest('hex');
    
    if (signature !== expectedSignature) {
      return false;
    }

    // Parse data
    const [tokenSessionId, timestampStr] = data.split(':');
    if (tokenSessionId !== sessionId) {
      return false;
    }

    // Check if token is expired
    const timestamp = parseInt(timestampStr);
    if (isNaN(timestamp)) {
      return false;
    }

    const now = Date.now();
    if (now - timestamp > CSRF_TOKEN_EXPIRY || now < timestamp) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('CSRF token verification error:', error);
    return false;
  }
}

/**
 * Get session ID from request (admin token)
 */
export function getSessionId(req) {
  // Try to get from cookie first
  const cookies = req.headers.cookie;
  if (cookies) {
    const cookieMatch = cookies.match(/adminToken=([^;]+)/);
    if (cookieMatch) {
      return cookieMatch[1];
    }
  }
  
  // Fallback: get from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

/**
 * Verify CSRF token from request headers
 * @param {object} req - Request object
 * @returns {{valid: boolean, error?: string}}
 */
export function verifyCSRF(req) {
  const sessionId = getSessionId(req);
  
  if (!sessionId) {
    return { valid: false, error: 'Missing session. Please log in again.' };
  }

  // Get CSRF token from header
  const csrfToken = req.headers['x-csrf-token'] || req.headers['csrf-token'];
  
  if (!csrfToken) {
    return { valid: false, error: 'CSRF token missing. Please log in again to get a new token.' };
  }

  const isValid = verifyCSRFToken(csrfToken, sessionId);
  if (!isValid) {
    // Try to decode token to see if it's old format
    try {
      // If it's old format (hex string), it will fail to decode
      Buffer.from(csrfToken, 'base64').toString('utf-8');
    } catch {
      return { valid: false, error: 'CSRF token format is outdated. Please log in again.' };
    }
    return { valid: false, error: 'Invalid or expired CSRF token. Please log in again.' };
  }

  return { valid: true };
}

/**
 * Verify Origin header to prevent CSRF
 * @param {object} req - Request object
 * @param {string[]} allowedOrigins - List of allowed origins
 * @returns {{valid: boolean, error?: string}}
 */
export function verifyOrigin(req, allowedOrigins) {
  const origin = req.headers.origin;
  
  // If allowedOrigins includes '*', allow all (including same-origin requests without origin header)
  if (allowedOrigins.includes('*')) {
    return { valid: true };
  }
  
  // If no origin and allowedOrigins is empty, allow (same-origin request)
  if (!origin && allowedOrigins.length === 0) {
    return { valid: true };
  }
  
  if (!origin) {
    // If origin is required but not provided, check if we have a referer
    const referer = req.headers.referer;
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const refererOrigin = refererUrl.origin;
        // Normalize allowed origins (remove trailing slash)
        const normalizedAllowed = allowedOrigins.map(o => o.replace(/\/$/, ''));
        if (normalizedAllowed.includes(refererOrigin)) {
          return { valid: true };
        }
      } catch {
        // Invalid referer URL
      }
    }
    return { valid: false, error: 'Origin header required' };
  }

  // Extract origin from origin header
  let originUrl;
  try {
    originUrl = new URL(origin);
  } catch {
    return { valid: false, error: 'Invalid origin format' };
  }

  const originHost = originUrl.origin;

  // Normalize allowed origins (remove trailing slash) and check
  const normalizedAllowed = allowedOrigins.map(o => o.replace(/\/$/, ''));
  
  // Check if origin is in allowed list
  if (normalizedAllowed.includes(originHost)) {
    return { valid: true };
  }

  return { valid: false, error: 'Origin not allowed' };
}

/**
 * Middleware to verify CSRF protection
 * Requires both CSRF token and Origin verification
 */
export function requireCSRF(req, allowedOrigins) {
  // Verify Origin first
  const originCheck = verifyOrigin(req, allowedOrigins);
  if (!originCheck.valid) {
    return originCheck;
  }

  // Verify CSRF token
  const csrfCheck = verifyCSRF(req);
  if (!csrfCheck.valid) {
    return csrfCheck;
  }

  return { valid: true };
}
