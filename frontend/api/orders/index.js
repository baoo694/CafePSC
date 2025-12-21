import { getSupabaseClient } from '../../lib/supabase.js';
import { rateLimit } from '../../lib/rateLimit.js';

export default async function handler(req, res) {
  // CORS headers
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate limiting for POST requests
  if (req.method === 'POST') {
    const rateLimitCheck = rateLimit(req, '/api/orders');
    if (!rateLimitCheck.allowed) {
      res.setHeader('Retry-After', rateLimitCheck.retryAfter);
      return res.status(429).json({ 
        error: rateLimitCheck.error || 'Too many requests. Please try again later.' 
      });
    }
  }

  // GET all orders - Admin only (requires authentication)
  if (req.method === 'GET') {
    // Import here to avoid circular dependency
    const { verifyAdminToken } = await import('../../lib/auth.js');
    
    // Verify admin authentication
    const authCheck = verifyAdminToken(req);
    if (!authCheck.valid) {
      return res.status(401).json({ error: 'Unauthorized: ' + authCheck.error });
    }

    // Rate limiting for GET requests
    const rateLimitCheck = rateLimit(req, '/api/orders');
    if (!rateLimitCheck.allowed) {
      res.setHeader('Retry-After', rateLimitCheck.retryAfter);
      return res.status(429).json({ 
        error: rateLimitCheck.error || 'Too many requests. Please try again later.' 
      });
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // POST new order
  if (req.method === 'POST') {
    try {
      const { customer_name, phone, delivery_address, note, items } = req.body;

      // Validate customer_name
      if (!customer_name || typeof customer_name !== 'string') {
        return res.status(400).json({ error: 'Tên khách hàng là bắt buộc' });
      }
      
      if (customer_name.trim().length === 0) {
        return res.status(400).json({ error: 'Tên khách hàng không được để trống' });
      }
      
      if (customer_name.length > 100) {
        return res.status(400).json({ error: 'Tên khách hàng không được vượt quá 100 ký tự' });
      }

      // Validate phone (optional but if provided, must be valid)
      if (phone && typeof phone === 'string') {
        // Basic phone validation: 10-15 digits, may include +, spaces, dashes
        const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
        if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
          return res.status(400).json({ error: 'Số điện thoại không hợp lệ' });
        }
        if (phone.length > 20) {
          return res.status(400).json({ error: 'Số điện thoại quá dài' });
        }
      }

      // Validate delivery_address (optional but if provided, must be valid)
      if (delivery_address && typeof delivery_address === 'string') {
        if (delivery_address.length > 200) {
          return res.status(400).json({ error: 'Địa chỉ giao hàng không được vượt quá 200 ký tự' });
        }
      }

      // Validate note
      if (note && typeof note === 'string' && note.length > 500) {
        return res.status(400).json({ error: 'Ghi chú không được vượt quá 500 ký tự' });
      }

      // Validate items
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Đơn hàng phải có ít nhất một sản phẩm' });
      }

      if (items.length > 50) {
        return res.status(400).json({ error: 'Đơn hàng không được có quá 50 sản phẩm' });
      }

      // Validate each item
      for (const item of items) {
        if (!item.product_id || isNaN(parseInt(item.product_id))) {
          return res.status(400).json({ error: 'Mỗi sản phẩm phải có product_id hợp lệ' });
        }
        
        if (!item.quantity || isNaN(parseInt(item.quantity)) || parseInt(item.quantity) < 1) {
          return res.status(400).json({ error: 'Số lượng sản phẩm phải là số nguyên dương' });
        }
        
        if (parseInt(item.quantity) > 100) {
          return res.status(400).json({ error: 'Số lượng mỗi sản phẩm không được vượt quá 100' });
        }
      }

      // Check if all products are available
      const supabase = getSupabaseClient();
      const productIds = items.map(item => parseInt(item.product_id));
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, is_available')
        .in('id', productIds);

      if (productsError) throw productsError;

      // Check if all requested products exist
      if (products.length !== productIds.length) {
        return res.status(400).json({ error: 'Một hoặc nhiều sản phẩm không tồn tại' });
      }

      // Check if all products are available
      const unavailableProducts = products.filter(p => !p.is_available);
      if (unavailableProducts.length > 0) {
        const productNames = unavailableProducts.map(p => p.name).join(', ');
        return res.status(400).json({ 
          error: `Không thể đặt hàng. Các sản phẩm sau hiện không có sẵn: ${productNames}` 
        });
      }

      const orderData = {
        customer_name: customer_name.trim(),
        note: note ? note.trim() : null,
        status: 'pending',
      };

      if (phone) orderData.phone = phone.trim();
      if (delivery_address) orderData.delivery_address = delivery_address.trim();

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        options_json: item.options || {},
      }));

      const { data: insertedItems, error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)
        .select(`
          *,
          product:products (*)
        `);

      if (itemsError) throw itemsError;

      const fullOrder = { ...order, order_items: insertedItems };
      return res.status(200).json(fullOrder);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

