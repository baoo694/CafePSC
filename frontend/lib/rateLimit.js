// Simple in-memory rate limiter
// Note: In serverless environments, this won't work perfectly across instances
// For production, consider using Redis or Vercel Edge Config

const requestCounts = new Map();
const customerRequestCounts = new Map(); // For customer-based rate limiting
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = {
  '/api/orders': 50, // 50 orders per minute per IP (backup limit - cao hơn cho mạng chung)
  '/api/admin/login': 5, // 5 login attempts per minute per IP
  '/api/products': 30, // 30 requests per minute per IP (chống scraping)
  '/api/orders/cancel': 5, // 5 cancel requests per minute per IP
  default: 30 // 30 requests per minute for other endpoints
};

// Customer-based rate limits (for school network environments)
const MAX_ORDERS_PER_CUSTOMER = 10; // 10 orders per minute per customer

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of requestCounts.entries()) {
    if (now - data.firstRequest > RATE_LIMIT_WINDOW * 2) {
      requestCounts.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function rateLimit(req, endpoint = 'default') {
  // Get client IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
             req.headers['x-real-ip'] || 
             req.connection?.remoteAddress || 
             'unknown';
  
  const key = `${ip}:${endpoint}`;
  const now = Date.now();
  const limit = MAX_REQUESTS_PER_WINDOW[endpoint] || MAX_REQUESTS_PER_WINDOW.default;
  
  if (!requestCounts.has(key)) {
    requestCounts.set(key, {
      count: 1,
      firstRequest: now,
      lastRequest: now
    });
    return { allowed: true };
  }
  
  const data = requestCounts.get(key);
  
  // Reset if window has passed
  if (now - data.firstRequest > RATE_LIMIT_WINDOW) {
    data.count = 1;
    data.firstRequest = now;
    data.lastRequest = now;
    return { allowed: true };
  }
  
  // Check if limit exceeded
  if (data.count >= limit) {
    return { 
      allowed: false, 
      error: `Rate limit exceeded. Maximum ${limit} requests per minute.`,
      retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - data.firstRequest)) / 1000)
    };
  }
  
  // Increment count
  data.count++;
  data.lastRequest = now;
  
  return { allowed: true };
}

/**
 * Customer-based rate limiting
 * Phù hợp cho môi trường trường học (nhiều người dùng chung IP)
 * @param {string} customerName - Tên khách hàng
 * @param {string} phone - Số điện thoại
 * @returns {{allowed: boolean, error?: string, retryAfter?: number}}
 */
export function customerRateLimit(customerName, phone) {
  if (!customerName || !phone) {
    // Nếu không có customer info, fallback về IP-based
    return { allowed: true };
  }
  
  // Tạo key từ customer_name + phone
  const customerKey = `${customerName.trim().toLowerCase()}:${phone.trim()}`;
  const key = `customer:${customerKey}`;
  const now = Date.now();
  
  if (!customerRequestCounts.has(key)) {
    customerRequestCounts.set(key, {
      count: 1,
      firstRequest: now,
      lastRequest: now
    });
    return { allowed: true };
  }
  
  const data = customerRequestCounts.get(key);
  
  // Reset if window has passed
  if (now - data.firstRequest > RATE_LIMIT_WINDOW) {
    data.count = 1;
    data.firstRequest = now;
    data.lastRequest = now;
    return { allowed: true };
  }
  
  // Check if limit exceeded
  if (data.count >= MAX_ORDERS_PER_CUSTOMER) {
    return { 
      allowed: false, 
      error: `Bạn đã đặt quá nhiều đơn hàng. Vui lòng đợi ${Math.ceil((RATE_LIMIT_WINDOW - (now - data.firstRequest)) / 1000)} giây.`,
      retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - data.firstRequest)) / 1000)
    };
  }
  
  // Increment count
  data.count++;
  data.lastRequest = now;
  
  return { allowed: true };
}

// Clean up customer rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of customerRequestCounts.entries()) {
    if (now - data.firstRequest > RATE_LIMIT_WINDOW * 2) {
      customerRequestCounts.delete(key);
    }
  }
}, 5 * 60 * 1000);

