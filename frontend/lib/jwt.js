import jwt from 'jsonwebtoken';

// JWT secret key (MUST be set in environment variable)
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  console.warn('⚠️ WARNING: JWT_SECRET not set. Using default (INSECURE for production).');
}

// Fallback for development only
const DEFAULT_JWT_SECRET = 'default-jwt-secret-change-in-production';
const effectiveSecret = JWT_SECRET || DEFAULT_JWT_SECRET;

/**
 * Generate JWT token for admin
 * @param {object} payload - Token payload (will include role: 'admin' and iat)
 * @returns {string} JWT token
 */
export function generateAdminToken(payload = {}) {
  const tokenPayload = {
    role: 'admin',
    ...payload,
    iat: Math.floor(Date.now() / 1000), // Issued at time
  };

  return jwt.sign(tokenPayload, effectiveSecret, {
    expiresIn: '24h', // Token expires in 24 hours
  });
}

/**
 * Verify old base64 token format (backward compatibility during migration)
 * @param {string} token - Base64 encoded token (admin:timestamp)
 * @returns {{valid: boolean, error?: string}}
 */
function verifyOldToken(token) {
  try {
    // Decode the token (it's base64 encoded)
    let decoded;
    if (typeof Buffer !== 'undefined') {
      decoded = Buffer.from(token, 'base64').toString('utf-8');
    } else {
      decoded = atob(token);
    }
    
    // Check if token format is correct (admin:timestamp)
    if (!decoded.startsWith('admin:')) {
      return { valid: false, error: 'Invalid old token format' };
    }
    
    // Extract timestamp
    const timestamp = parseInt(decoded.split(':')[1]);
    
    if (isNaN(timestamp)) {
      return { valid: false, error: 'Invalid old token timestamp' };
    }
    
    // Check if token is expired (24 hours)
    const now = Date.now();
    const tokenAge = now - timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    if (tokenAge > maxAge || tokenAge < 0) {
      return { valid: false, error: 'Old token expired. Please log in again to get a new JWT token.' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid old token' };
  }
}

/**
 * Check if token is old format (base64) vs new format (JWT)
 * @param {string} token - Token to check
 * @returns {boolean} True if old format
 */
function isOldTokenFormat(token) {
  // JWT tokens have 3 parts separated by dots: header.payload.signature
  // Old tokens are just base64 encoded strings
  if (!token) return false;
  
  // JWT format: has dots and is longer
  const hasJWTFormat = token.includes('.') && token.split('.').length === 3;
  
  // Old format: no dots, shorter, base64 encoded
  const isOldFormat = !hasJWTFormat && token.length < 100;
  
  return isOldFormat;
}

/**
 * Verify JWT token (with backward compatibility for old tokens)
 * @param {string} token - JWT token to verify
 * @returns {{valid: boolean, payload?: object, error?: string}}
 */
export function verifyAdminToken(token) {
  if (!token) {
    return { valid: false, error: 'Missing token' };
  }

  // Check if it's old token format (backward compatibility during migration)
  if (isOldTokenFormat(token)) {
    const oldTokenResult = verifyOldToken(token);
    if (!oldTokenResult.valid) {
      return {
        valid: false,
        error: oldTokenResult.error || 'Old token format is no longer supported. Please log out and log in again to get a new JWT token.'
      };
    }
    // Old token is valid, but warn that it should be upgraded
    return {
      valid: true,
      payload: { role: 'admin', isOldToken: true },
      warning: 'Using old token format. Please log out and log in again to upgrade to JWT token.'
    };
  }

  // Verify JWT token (new format)
  try {
    // Verify token signature and expiration
    const decoded = jwt.verify(token, effectiveSecret);
    
    // Check if token has admin role
    if (decoded.role !== 'admin') {
      return { valid: false, error: 'Invalid token role' };
    }

    return { valid: true, payload: decoded };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { valid: false, error: 'Token expired. Please log in again.' };
    }
    if (error.name === 'JsonWebTokenError') {
      return { valid: false, error: 'Invalid JWT token. Please log out and log in again.' };
    }
    return { valid: false, error: 'Token verification failed' };
  }
}

/**
 * Get token from request (cookie or Authorization header)
 * @param {object} req - Request object
 * @returns {string|null} Token or null
 */
export function getTokenFromRequest(req) {
  // Try to get from cookie first (httpOnly cookie)
  const cookies = req.headers.cookie;
  if (cookies) {
    const cookieMatch = cookies.match(/adminToken=([^;]+)/);
    if (cookieMatch) {
      return cookieMatch[1];
    }
  }
  
  // Fallback: get from Authorization header (backward compatibility)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }
  
  return null;
}

