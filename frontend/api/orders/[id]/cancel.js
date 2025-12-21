import { getSupabaseClient } from '../../../lib/supabase.js';
import { rateLimit } from '../../../lib/rateLimit.js';

const supabase = getSupabaseClient();

export default async function handler(req, res) {
  // CORS headers
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (req.method === 'PUT') {
    // Rate limiting
    const rateLimitCheck = rateLimit(req, '/api/orders/cancel');
    if (!rateLimitCheck.allowed) {
      res.setHeader('Retry-After', rateLimitCheck.retryAfter);
      return res.status(429).json({ 
        error: rateLimitCheck.error || 'Too many requests. Please try again later.' 
      });
    }

    try {
      // Validate input
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'Invalid order ID' });
      }

      // Check if order is pending
      const { data: existingOrder, error: checkError } = await supabase
        .from('orders')
        .select('status, customer_name, phone')
        .eq('id', id)
        .single();

      if (checkError || !existingOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (existingOrder.status !== 'pending') {
        return res.status(400).json({ error: 'Chỉ có thể hủy đơn đang chờ xử lý' });
      }

      // Verify ownership: Check customer_name and phone from request body
      // Frontend should send these to verify ownership
      const { customer_name, phone } = req.body;
      
      if (customer_name && phone) {
        // Verify ownership
        if (existingOrder.customer_name !== customer_name.trim() || 
            existingOrder.phone !== phone.trim()) {
          return res.status(403).json({ error: 'Không có quyền hủy đơn hàng này' });
        }
      }
      // If no customer info provided, allow cancel (backward compatibility)
      // But recommend frontend always send customer info

      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select(`
          *,
          order_items (
            *,
            product:products (*)
          )
        `)
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}


