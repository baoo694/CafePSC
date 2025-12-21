import { rateLimit } from '../lib/rateLimit.js';

export default async function handler(req, res) {
  // CORS headers
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
    
    // Validate password input
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }

    if (password === ADMIN_PASSWORD) {
      const token = Buffer.from(`admin:${Date.now()}`).toString('base64');
      return res.status(200).json({ success: true, token });
    } else {
      return res.status(401).json({ success: false, error: 'Mật khẩu không đúng' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}


