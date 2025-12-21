// Helper function to verify admin token
// Ưu tiên đọc từ httpOnly cookie (an toàn hơn), fallback về Authorization header (backward compatibility)
export function verifyAdminToken(req) {
  // Đọc token từ cookie (ưu tiên)
  let token = null;
  const cookies = req.headers.cookie;
  
  if (cookies) {
    const cookieMatch = cookies.match(/adminToken=([^;]+)/);
    if (cookieMatch) {
      token = cookieMatch[1];
    }
  }
  
  // Fallback: đọc từ Authorization header (backward compatibility)
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }
  }
  
  if (!token) {
    return { valid: false, error: 'Missing authentication token' };
  }
  
  try {
    // Decode the token (it's base64 encoded)
    // Use atob for browser/serverless environment
    let decoded;
    if (typeof Buffer !== 'undefined') {
      decoded = Buffer.from(token, 'base64').toString('utf-8');
    } else {
      decoded = atob(token);
    }
    
    // Check if token format is correct (admin:timestamp)
    if (!decoded.startsWith('admin:')) {
      return { valid: false, error: 'Invalid token format' };
    }
    
    // Extract timestamp
    const timestamp = parseInt(decoded.split(':')[1]);
    
    if (isNaN(timestamp)) {
      return { valid: false, error: 'Invalid token timestamp' };
    }
    
    // Check if token is expired (24 hours)
    const now = Date.now();
    const tokenAge = now - timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    if (tokenAge > maxAge || tokenAge < 0) {
      return { valid: false, error: 'Token expired' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid token' };
  }
}

// Middleware function for admin routes
export function requireAdmin(req, res, next) {
  const verification = verifyAdminToken(req);
  
  if (!verification.valid) {
    return res.status(401).json({ error: 'Unauthorized: ' + verification.error });
  }
  
  next();
}

