import { getSupabaseClient } from '../lib/supabase.js';
import { verifyAdminToken } from '../lib/auth.js';
import { rateLimit } from '../lib/rateLimit.js';

// Helper function để set CORS headers
function setCORSHeaders(res, req, methods = 'GET, POST, OPTIONS') {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (!origin && allowedOrigins.length === 0) {
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
    return;
  }
  
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') {
      setCORSHeaders(res, req);
      return res.status(200).end();
    }

    // Route: GET /api/orders (Admin only)
    if (req.method === 'GET') {
      setCORSHeaders(res, req, 'GET, OPTIONS');
      
      const authCheck = verifyAdminToken(req);
      if (!authCheck.valid) {
        return res.status(401).json({ error: 'Unauthorized: ' + authCheck.error });
      }

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

    // Route: POST /api/orders
    if (req.method === 'POST') {
      setCORSHeaders(res, req, 'POST, OPTIONS');
      
      const rateLimitCheck = rateLimit(req, '/api/orders');
      if (!rateLimitCheck.allowed) {
        res.setHeader('Retry-After', rateLimitCheck.retryAfter);
        return res.status(429).json({ 
          error: rateLimitCheck.error || 'Too many requests. Please try again later.' 
        });
      }

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

        // Validate phone
        if (phone && typeof phone === 'string') {
          const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
          if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
            return res.status(400).json({ error: 'Số điện thoại không hợp lệ' });
          }
          if (phone.length > 20) {
            return res.status(400).json({ error: 'Số điện thoại quá dài' });
          }
        }

        // Validate delivery_address
        if (delivery_address && typeof delivery_address === 'string') {
          if (delivery_address.length > 200) {
            return res.status(400).json({ error: 'Địa chỉ giao hàng không được vượt quá 200 ký tự' });
          }
        }

        // Validate and sanitize note
        let sanitizedNote = null;
        if (note && typeof note === 'string') {
          if (note.length > 500) {
            return res.status(400).json({ error: 'Ghi chú không được vượt quá 500 ký tự' });
          }
          sanitizedNote = note.replace(/<[^>]*>/g, '').trim();
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
        if (products.length !== productIds.length) {
          return res.status(400).json({ error: 'Một hoặc nhiều sản phẩm không tồn tại' });
        }

        const unavailableProducts = products.filter(p => !p.is_available);
        if (unavailableProducts.length > 0) {
          const productNames = unavailableProducts.map(p => p.name).join(', ');
          return res.status(400).json({ 
            error: `Không thể đặt hàng. Các sản phẩm sau hiện không có sẵn: ${productNames}` 
          });
        }

        // Sanitize all inputs
        const sanitizeInput = (input) => {
          if (!input || typeof input !== 'string') return input;
          return input.replace(/<[^>]*>/g, '').trim();
        };

        const orderData = {
          customer_name: sanitizeInput(customer_name),
          note: sanitizedNote,
          status: 'pending',
        };

        if (phone) orderData.phone = sanitizeInput(phone);
        if (delivery_address) orderData.delivery_address = sanitizeInput(delivery_address);

        // SECURITY FIX: Double-check product availability right before inserting order
        // This prevents race condition where admin disables product between check and insert
        const { data: productsRecheck, error: recheckError } = await supabase
          .from('products')
          .select('id, name, is_available')
          .in('id', productIds);
        
        if (recheckError) throw recheckError;
        
        // Verify all products still exist
        if (productsRecheck.length !== productIds.length) {
          return res.status(400).json({ error: 'Một hoặc nhiều sản phẩm không tồn tại' });
        }
        
        // Verify all products are still available
        const unavailableRecheck = productsRecheck.filter(p => !p.is_available);
        if (unavailableRecheck.length > 0) {
          const productNames = unavailableRecheck.map(p => p.name).join(', ');
          return res.status(400).json({ 
            error: `Không thể đặt hàng. Các sản phẩm sau đã bị tắt trong lúc xử lý: ${productNames}` 
          });
        }

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
  } catch (error) {
    console.error('API route error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
