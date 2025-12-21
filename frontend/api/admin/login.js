import { rateLimit } from '../../lib/rateLimit.js';
import { generateCSRFToken } from '../../lib/csrf.js';
import { generateAdminToken } from '../../lib/jwt.js';

export default async function handler(req, res) {
  // CORS headers
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    // Rate limiting for login attempts
    const rateLimitCheck = rateLimit(req, '/api/admin/login');
    if (!rateLimitCheck.allowed) {
      res.setHeader('Retry-After', rateLimitCheck.retryAfter);
      return res.status(429).json({ 
        success: false,
        error: rateLimitCheck.error || 'Too many login attempts. Please try again later.' 
      });
    }

    const { password } = req.body;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    
    // Check if ADMIN_PASSWORD is configured
    if (!ADMIN_PASSWORD) {
      console.error('ADMIN_PASSWORD environment variable is not set');
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error' 
      });
    }
    
    // Validate password input
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }

    if (password === ADMIN_PASSWORD) {
      // Generate JWT token (secure, signed with secret key)
      const token = generateAdminToken();
      
      // Generate CSRF token
      const csrfToken = generateCSRFToken(token);
      
      // Set httpOnly cookie để bảo vệ khỏi XSS
      const maxAge = 24 * 60 * 60; // 24 hours in seconds
      const isProduction = process.env.NODE_ENV === 'production';
      
      // Set cookie với Secure flag trong production, không có Secure trong development
      const cookieOptions = [
        `adminToken=${token}`,
        'HttpOnly',
        'SameSite=Strict',
        `Max-Age=${maxAge}`,
        'Path=/'
      ];
      
      if (isProduction) {
        cookieOptions.push('Secure');
      }
      
      res.setHeader('Set-Cookie', cookieOptions.join('; '));
      
      // Return CSRF token in response (client will store and send in subsequent requests)
      return res.status(200).json({ 
        success: true,
        csrfToken: csrfToken 
      });
    } else {
      return res.status(401).json({ success: false, error: 'Mật khẩu không đúng' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}


