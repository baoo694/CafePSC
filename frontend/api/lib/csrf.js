import crypto from 'crypto';

// CSRF token storage (in-memory, sẽ reset khi serverless function restart)
// Trong production, nên dùng Redis hoặc database để persist
const csrfTokens = new Map();
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Clean up expired tokens every hour
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of csrfTokens.entries()) {
    if (now - data.createdAt > CSRF_TOKEN_EXPIRY) {
      csrfTokens.delete(token);
    }
  }
}, 60 * 60 * 1000);

/**
 * Generate a new CSRF token
 * @param {string} sessionId - Unique session identifier (e.g., admin token)
 * @returns {string} CSRF token
 */
export function generateCSRFToken(sessionId) {
  const token = crypto.randomBytes(32).toString('hex');
  csrfTokens.set(token, {
    sessionId,
    createdAt: Date.now(),
  });
  return token;
}

/**
 * Verify CSRF token
 * @param {string} token - CSRF token from request
 * @param {string} sessionId - Session identifier (e.g., admin token)
 * @returns {boolean} True if token is valid
 */
export function verifyCSRFToken(token, sessionId) {
  if (!token || !sessionId) {
    return false;
  }

  const tokenData = csrfTokens.get(token);
  if (!tokenData) {
    return false;
  }

  // Check if token belongs to this session
  if (tokenData.sessionId !== sessionId) {
    return false;
  }

  // Check if token is expired
  const now = Date.now();
  if (now - tokenData.createdAt > CSRF_TOKEN_EXPIRY) {
    csrfTokens.delete(token);
    return false;
  }

  return true;
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
    return { valid: false, error: 'Missing session' };
  }

  // Get CSRF token from header
  const csrfToken = req.headers['x-csrf-token'] || req.headers['csrf-token'];
  
  if (!csrfToken) {
    return { valid: false, error: 'CSRF token missing' };
  }

  if (!verifyCSRFToken(csrfToken, sessionId)) {
    return { valid: false, error: 'Invalid or expired CSRF token' };
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
  
  if (!origin) {
    // Some requests don't have origin (e.g., same-origin, Postman)
    // For admin routes, we should require origin
    return { valid: false, error: 'Origin header required' };
  }

  // Extract origin from referer if needed
  let originUrl;
  try {
    originUrl = new URL(origin);
  } catch {
    return { valid: false, error: 'Invalid origin format' };
  }

  const originHost = originUrl.origin;

  // Check if origin is in allowed list
  if (allowedOrigins.includes('*')) {
    return { valid: true }; // Allow all (not recommended for production)
  }

  if (allowedOrigins.includes(originHost)) {
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
