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
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {{valid: boolean, payload?: object, error?: string}}
 */
export function verifyAdminToken(token) {
  if (!token) {
    return { valid: false, error: 'Missing token' };
  }

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
      return { valid: false, error: 'Token expired' };
    }
    if (error.name === 'JsonWebTokenError') {
      return { valid: false, error: 'Invalid token' };
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
  
  // Fallback: get from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }
  
  return null;
}

