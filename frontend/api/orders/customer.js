import { getSupabaseClient } from '../../lib/supabase.js';
import { rateLimit } from '../../lib/rateLimit.js';

function setCORSHeaders(res, req, methods = 'GET, OPTIONS') {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (!origin && allowedOrigins.length === 0) {
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return;
  }
  
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') {
      setCORSHeaders(res, req);
      return res.status(200).end();
    }

    // GET customer orders - requires customer_name and phone as query params
    if (req.method === 'GET') {
      setCORSHeaders(res, req, 'GET, OPTIONS');
      
      const rateLimitCheck = rateLimit(req, '/api/orders/customer');
      if (!rateLimitCheck.allowed) {
        res.setHeader('Retry-After', rateLimitCheck.retryAfter);
        return res.status(429).json({ 
          error: rateLimitCheck.error || 'Too many requests. Please try again later.' 
        });
      }

      const { customer_name, phone } = req.query;

      // Validate required parameters
      if (!customer_name || typeof customer_name !== 'string' || customer_name.trim().length === 0) {
        return res.status(400).json({ error: 'customer_name is required' });
      }

      if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
        return res.status(400).json({ error: 'phone is required' });
      }

      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (
              *,
              product:products (*)
            )
          `)
          .eq('customer_name', customer_name.trim())
          .eq('phone', phone.trim())
          .order('created_at', { ascending: false });

        if (error) throw error;
        return res.status(200).json(data || []);
      } catch (error) {
        console.error('Error fetching customer orders:', error);
        return res.status(500).json({ error: error.message });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API route error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}


