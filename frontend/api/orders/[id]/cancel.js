import { getSupabaseClient, getAdminSupabaseClient } from '../../../lib/supabase.js';
import { rateLimit } from '../../../lib/rateLimit.js';

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

  // Debug logging
  console.log('Cancel order request:', { 
    method: req.method, 
    id, 
    query: req.query,
    body: req.body 
  });

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
      if (!id) {
        console.error('Missing id in query:', req.query);
        return res.status(400).json({ error: 'Invalid order ID: missing id parameter' });
      }
      
      const orderId = parseInt(id);
      if (isNaN(orderId)) {
        console.error('Invalid id format:', id);
        return res.status(400).json({ error: `Invalid order ID: ${id} is not a number` });
      }

      console.log('Parsed order ID:', orderId);

      const supabase = getSupabaseClient();
      
      if (!supabase) {
        console.error('Supabase client is null');
        return res.status(500).json({ error: 'Database connection error' });
      }
      
      // Check if order is pending
      const { data: existingOrder, error: checkError } = await supabase
        .from('orders')
        .select('status, customer_name, phone')
        .eq('id', orderId)
        .single();

      if (checkError) {
        console.error('Error checking order:', checkError);
        if (checkError.code === 'PGRST116') {
          return res.status(404).json({ error: 'Order not found' });
        }
        throw checkError;
      }

      if (!existingOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (existingOrder.status !== 'pending') {
        return res.status(400).json({ error: 'Chỉ có thể hủy đơn đang chờ xử lý' });
      }

      // Verify ownership: Check customer_name and phone from request body
      // Frontend should send these to verify ownership
      let customer_name, phone;
      
      try {
        // Parse body if it's a string
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        customer_name = body?.customer_name;
        phone = body?.phone;
      } catch (parseError) {
        console.error('Error parsing request body:', parseError);
        return res.status(400).json({ error: 'Invalid request body format' });
      }
      
      if (!customer_name || !phone) {
        console.error('Missing customer info:', { customer_name: !!customer_name, phone: !!phone });
        return res.status(400).json({ error: 'customer_name và phone là bắt buộc để xác minh quyền sở hữu đơn hàng' });
      }
      
      // Verify ownership
      if (existingOrder.customer_name !== customer_name.trim() || 
          existingOrder.phone !== phone.trim()) {
        return res.status(403).json({ error: 'Không có quyền hủy đơn hàng này' });
      }

      // Use admin client to update (bypasses RLS)
      const adminSupabase = getAdminSupabaseClient();
      
      // First update the order
      const { error: updateError } = await adminSupabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (updateError) {
        console.error('Error updating order:', updateError);
        throw updateError;
      }
      
      // Then fetch the updated order
      const { data, error: fetchError } = await adminSupabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product:products (*)
          )
        `)
        .eq('id', orderId)
        .single();

      if (fetchError) {
        console.error('Error fetching updated order:', fetchError);
        if (fetchError.code === 'PGRST116') {
          return res.status(404).json({ error: 'Order not found after update' });
        }
        throw fetchError;
      }
      
      if (!data) {
        return res.status(404).json({ error: 'Order not found after update' });
      }
      
      return res.status(200).json(data);
    } catch (error) {
      console.error('Cancel order error:', error);
      return res.status(500).json({ 
        error: error.message || 'Internal server error',
        debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}


