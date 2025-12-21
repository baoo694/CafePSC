import { getSessionId } from '../../lib/csrf.js';

export default async function handler(req, res) {
  // CORS headers
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    // Get session ID to invalidate CSRF tokens
    const sessionId = getSessionId(req);
    
    // Invalidate CSRF tokens for this session (if using Redis/database)
    // For in-memory storage, tokens will expire naturally
    
    // Xóa cookie bằng cách set Max-Age=0
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = [
      'adminToken=',
      'HttpOnly',
      'SameSite=Strict',
      'Max-Age=0',
      'Path=/'
    ];
    
    if (isProduction) {
      cookieOptions.push('Secure');
    }
    
    res.setHeader('Set-Cookie', cookieOptions.join('; '));
    
    return res.status(200).json({ success: true, message: 'Đã đăng xuất' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

