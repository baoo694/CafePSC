import { verifyAdminToken as verifyJWT, getTokenFromRequest } from './jwt.js';

// Helper function to verify admin token
// Now uses JWT for secure token verification (with backward compatibility for old tokens)
export function verifyAdminToken(req) {
  const token = getTokenFromRequest(req);
  
  if (!token) {
    return { valid: false, error: 'Missing authentication token. Please log in again.' };
  }
  
  // Verify token (JWT or old format)
  const result = verifyJWT(token);
  
  // Log warning if using old token (only in development)
  if (result.valid && result.warning && process.env.NODE_ENV === 'development') {
    console.warn('⚠️', result.warning);
  }
  
  return result;
}

// Middleware function for admin routes
export function requireAdmin(req, res, next) {
  const verification = verifyAdminToken(req);
  
  if (!verification.valid) {
    return res.status(401).json({ error: 'Unauthorized: ' + verification.error });
  }
  
  next();
}

