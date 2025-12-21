import { verifyAdminToken as verifyJWT, getTokenFromRequest } from './jwt.js';

// Helper function to verify admin token
// Now uses JWT for secure token verification
export function verifyAdminToken(req) {
  const token = getTokenFromRequest(req);
  
  if (!token) {
    return { valid: false, error: 'Missing authentication token' };
  }
  
  // Verify JWT token
  return verifyJWT(token);
}

// Middleware function for admin routes
export function requireAdmin(req, res, next) {
  const verification = verifyAdminToken(req);
  
  if (!verification.valid) {
    return res.status(401).json({ error: 'Unauthorized: ' + verification.error });
  }
  
  next();
}

