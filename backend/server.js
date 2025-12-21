import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const server = createServer(app);

// CORS config cho production
const corsOrigins = process.env.FRONTEND_URL 
  ? [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000']
  : '*';

const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
app.use(express.json());

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ============== REST API Routes ==============

// Admin authentication
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  
  if (password === ADMIN_PASSWORD) {
    // Tạo token đơn giản (trong thực tế nên dùng JWT)
    const token = Buffer.from(`admin:${Date.now()}`).toString('base64');
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, error: 'Mật khẩu không đúng' });
  }
});

// Helper function to verify admin token
const verifyAdminToken = (req) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or invalid authorization header' };
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  try {
    // Decode the token (it's base64 encoded)
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    
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
};

// Middleware kiểm tra admin token
const requireAdmin = (req, res, next) => {
  const verification = verifyAdminToken(req);
  
  if (!verification.valid) {
    return res.status(401).json({ error: 'Unauthorized: ' + verification.error });
  }
  
  next();
};

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id');
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product availability (admin only)
app.put('/api/products/:id/availability', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_available } = req.body;
    
    // Validate input
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    
    if (typeof is_available !== 'boolean') {
      return res.status(400).json({ error: 'is_available must be a boolean' });
    }
    
    const { data, error } = await supabase
      .from('products')
      .update({ is_available })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Broadcast menu update to all clients
    io.emit('menu:update', data);
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all orders
app.get('/api/orders', async (req, res) => {
  try {
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
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Spam detection helper
function detectSpamPattern(customerName, phone, deliveryAddress) {
  if (!customerName) return { isSpam: false };
  
  const name = customerName.trim().toLowerCase();
  
  // Pattern: khach1, khach2, "Khách 1", "Khách 2"... (có hoặc không có khoảng trắng)
  // Chặn "Khách n" với n từ 1 đến 100000
  const sequentialMatch = name.match(/^(khách|khach|test|user|customer|guest|demo|spam|hack)\s*(\d+)$/i);
  if (sequentialMatch) {
    const number = parseInt(sequentialMatch[2]);
    // Chặn nếu số từ 1 đến 100000
    if (number >= 1 && number <= 100000) {
      return { isSpam: true, reason: `Tên khách hàng có pattern spam (tăng dần: Khách ${number})` };
    }
  }
  
  // Pattern: tên quá ngắn + số (ví dụ: a1, b2)
  if (name.length < 5 && /^\w+\d+$/.test(name)) {
    return { isSpam: true, reason: 'Tên khách hàng có dấu hiệu spam' };
  }
  
  // Check phone pattern: 0900000001, 0900000002...
  if (phone) {
    const phoneClean = phone.replace(/[\s\-\(\)\.]/g, '');
    
    // Remove +84 prefix if present
    let phoneNumber = phoneClean;
    if (phoneClean.startsWith('+84')) {
      phoneNumber = '0' + phoneClean.slice(3);
    }
    
    // Must be 10 digits starting with 0
    if (phoneNumber.match(/^0\d{9}$/)) {
      // Pattern 1: Số cuối tăng dần (01-100000)
      const lastDigits = phoneNumber.slice(-3);
      const lastDigit = parseInt(lastDigits);
      
      if (lastDigit >= 1 && lastDigit <= 100000) {
        const prefix = phoneNumber.slice(0, -lastDigits.length);
        const uniqueDigits = new Set(prefix.split(''));
        if (uniqueDigits.size <= 2) {
          return { isSpam: true, reason: `Số điện thoại có pattern spam (tăng dần: ${phoneNumber})` };
        }
      }
      
      // Pattern 2: Nhiều chữ số giống nhau (0900000000)
      const digitCounts = {};
      for (const digit of phoneNumber) {
        digitCounts[digit] = (digitCounts[digit] || 0) + 1;
      }
      const maxCount = Math.max(...Object.values(digitCounts));
      if (maxCount >= 7) {
        return { isSpam: true, reason: 'Số điện thoại có nhiều chữ số giống nhau (có thể là giả)' };
      }
      
      // Pattern 3: Pattern không hợp lệ
      if (phoneNumber.match(/^0(\d)\1{8}$/) || 
          phoneNumber === '0123456789' || 
          phoneNumber === '0987654321') {
        return { isSpam: true, reason: 'Số điện thoại có pattern không hợp lệ' };
      }
    }
  }
  
  // Check address pattern: A1, A2, address1...
  if (deliveryAddress) {
    const addr = deliveryAddress.trim().toLowerCase();
    
    // Pattern 1: Sequential (A1, address1...)
    const sequentialMatch = addr.match(/^(A|address|diachi|add|test|demo|spam)\s*(\d+)$/i);
    if (sequentialMatch) {
      const number = parseInt(sequentialMatch[2]);
      if (number >= 1 && number <= 100000) {
        return { isSpam: true, reason: `Địa chỉ có pattern spam (tăng dần: ${deliveryAddress})` };
      }
    }
    
    // Pattern 2: Quá ngắn và có số
    if (addr.length < 5 && /\d+/.test(addr)) {
      return { isSpam: true, reason: 'Địa chỉ quá ngắn và có dấu hiệu spam' };
    }
    
    // Pattern 3: Có từ spam
    const spamWords = ['test', 'demo', 'spam', 'fake', 'hack', 'bot'];
    for (const word of spamWords) {
      if (addr.includes(word) && /\d+/.test(addr)) {
        return { isSpam: true, reason: 'Địa chỉ có từ khóa spam' };
      }
    }
  }
  
  return { isSpam: false };
}

// Spam tracking for backend
const spamAttempts = new Map();
const bannedIPs = new Map(); // Only for severe DDoS
const bannedCustomers = new Map(); // Customer-based banlist
const SPAM_WINDOW = 2 * 60 * 1000; // 2 minutes (for spam tracking)
const BAN_DURATION = 5 * 60 * 1000; // 5 minutes
const SPAM_THRESHOLD = 5; // Ban customer after 5 spam attempts
const IP_DDOS_THRESHOLD = 100; // Ban IP only if > 100 requests/min

function isIPBanned(ip) {
  const banData = bannedIPs.get(ip);
  if (!banData) return false;
  
  const now = Date.now();
  if (now - banData.bannedAt > BAN_DURATION) {
    bannedIPs.delete(ip);
    spamAttempts.delete(ip);
    return false;
  }
  return true;
}

function isCustomerBanned(customerName, phone) {
  if (!customerName || !phone) return false;
  
  const customerKey = `${customerName.trim().toLowerCase()}:${phone.trim()}`;
  const banData = bannedCustomers.get(customerKey);
  if (!banData) return false;
  
  const now = Date.now();
  if (now - banData.bannedAt > BAN_DURATION) {
    bannedCustomers.delete(customerKey);
    return false;
  }
  return true;
}

function recordSpamAttempt(ip, customerName, phone) {
  const now = Date.now();
  
  // Track IP spam attempts (for DDoS detection)
  const ipAttempts = spamAttempts.get(ip) || { count: 0, firstAttempt: now };
  ipAttempts.count++;
  ipAttempts.lastAttempt = now;
  
  if (now - ipAttempts.firstAttempt > SPAM_WINDOW) {
    ipAttempts.count = 1;
    ipAttempts.firstAttempt = now;
  }
  
  spamAttempts.set(ip, ipAttempts);
  
  // Ban customer if threshold reached
  if (customerName && phone) {
    const customerKey = `${customerName.trim().toLowerCase()}:${phone.trim()}`;
    const customerAttempts = bannedCustomers.get(customerKey) || { count: 0, firstAttempt: now };
    
    customerAttempts.count++;
    customerAttempts.lastAttempt = now;
    
    if (now - customerAttempts.firstAttempt > SPAM_WINDOW) {
      customerAttempts.count = 1;
      customerAttempts.firstAttempt = now;
    }
    
    bannedCustomers.set(customerKey, customerAttempts);
    
    if (customerAttempts.count >= SPAM_THRESHOLD) {
      bannedCustomers.set(customerKey, { bannedAt: now });
      console.warn(`Customer ${customerKey} banned for ${BAN_DURATION / 1000}s due to ${customerAttempts.count} spam attempts`);
      return { banned: true, type: 'customer' };
    }
  }
  
  // Ban IP only for severe DDoS
  if (ipAttempts.count >= IP_DDOS_THRESHOLD) {
    bannedIPs.set(ip, { bannedAt: now });
    console.warn(`IP ${ip} banned for ${BAN_DURATION / 1000}s due to severe DDoS (${ipAttempts.count} requests/min)`);
    return { banned: true, type: 'ip' };
  }
  
  return { banned: false };
}

// Create new order
app.post('/api/orders', async (req, res) => {
  try {
    // Get IP early
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
               req.headers['x-real-ip'] || 
               req.connection?.remoteAddress || 
               'unknown';
    
    // Check if IP is banned
    if (isIPBanned(ip)) {
      return res.status(403).json({ 
        error: 'IP của bạn đã bị tạm thời chặn do spam. Vui lòng thử lại sau 5 phút.' 
      });
    }
    
    const { customer_name, phone, student_id, note, items, delivery_address } = req.body;
    
    // Check customer ban (customer-based banlist - phù hợp mạng chung)
    if (customer_name && phone) {
      if (isCustomerBanned(customer_name, phone)) {
        return res.status(403).json({ 
          error: 'Tài khoản của bạn đã bị tạm thời chặn do spam. Vui lòng thử lại sau 5 phút.' 
        });
      }
    }
    
    // EARLY SPAM DETECTION: Phát hiện spam ngay, không xử lý logic phức tạp
    const spamCheck = detectSpamPattern(customer_name, phone, delivery_address);
    if (spamCheck.isSpam) {
      // Record spam attempt and ban customer (not IP) if threshold reached
      const banResult = recordSpamAttempt(ip, customer_name, phone);
      
      console.warn('Spam detected:', { 
        ip,
        customer_name, 
        phone, 
        delivery_address, 
        reason: spamCheck.reason,
        banned: banResult.banned,
        banType: banResult.type
      });
      
      // Return immediately - no further processing
      if (banResult.banned) {
        if (banResult.type === 'customer') {
          return res.status(403).json({ 
            error: 'Tài khoản của bạn đã bị tạm thời chặn do spam. Vui lòng thử lại sau 5 phút.' 
          });
        } else if (banResult.type === 'ip') {
          return res.status(403).json({ 
            error: 'IP của bạn đã bị tạm thời chặn do DDoS. Vui lòng thử lại sau 5 phút.' 
          });
        }
      }
      
      return res.status(400).json({ 
        error: 'Đơn hàng không hợp lệ. Vui lòng sử dụng thông tin thật của bạn.' 
      });
    }
    
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
    
    // Tăng cường validation: tên phải có ít nhất 2 ký tự không phải số
    const nameWithoutNumbers = customer_name.replace(/\d/g, '');
    if (nameWithoutNumbers.trim().length < 2) {
      return res.status(400).json({ error: 'Tên khách hàng phải có ít nhất 2 ký tự chữ' });
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

    // Validate note
    if (note && typeof note === 'string' && note.length > 500) {
      return res.status(400).json({ error: 'Ghi chú không được vượt quá 500 ký tự' });
    }

    // Validate student_id if provided
    if (student_id && typeof student_id === 'string' && student_id.length > 50) {
      return res.status(400).json({ error: 'Mã sinh viên không được vượt quá 50 ký tự' });
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
    
    // Build order data - only include phone/student_id if they exist in DB
    const orderData = {
      customer_name: customer_name.trim(),
      note: note ? note.trim() : null,
      status: 'pending',
    };
    
    // Add optional fields if provided
    if (phone) orderData.phone = phone.trim();
    if (student_id) orderData.student_id = student_id.trim();
    
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
    
    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();
    
    if (orderError) throw orderError;
    
    // Create order items
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
    
    if (itemsError) {
      // Rollback: Delete the order if items insertion fails
      await supabase.from('orders').delete().eq('id', order.id);
      throw itemsError;
    }
    
    // SECURITY FIX: Ensure at least one item was inserted successfully
    // Prevent creating orders with 0 items (0đ total)
    if (!insertedItems || insertedItems.length === 0) {
      // Rollback: Delete the order if no items were inserted
      await supabase.from('orders').delete().eq('id', order.id);
      return res.status(400).json({ 
        error: 'Không thể tạo đơn hàng. Không có sản phẩm hợp lệ nào được thêm vào đơn hàng.' 
      });
    }
    
    const fullOrder = { ...order, order_items: insertedItems };
    
    // Broadcast new order to all clients
    io.emit('order:new', fullOrder);
    
    res.json(fullOrder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Valid order statuses
const VALID_STATUSES = ['pending', 'making', 'done', 'cancelled'];

// Update order status (admin only)
app.put('/api/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate input
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }
    
    if (!status || typeof status !== 'string') {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` 
      });
    }
    
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
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
    
    if (!data) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Broadcast status update to all clients
    io.emit('order:status', data);
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel order (customer can only cancel pending orders)
app.put('/api/orders/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First check if order is pending
    const { data: existingOrder, error: checkError } = await supabase
      .from('orders')
      .select('status')
      .eq('id', id)
      .single();
    
    if (checkError) throw checkError;
    
    if (existingOrder.status !== 'pending') {
      return res.status(400).json({ error: 'Chỉ có thể hủy đơn đang chờ xử lý' });
    }
    
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
    
    // Broadcast cancellation to all clients
    io.emit('order:cancelled', data);
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a specific order (admin action)
app.delete('/api/orders/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate input
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }
    
    // Check if order exists
    const { data: existingOrder, error: checkError } = await supabase
      .from('orders')
      .select('id')
      .eq('id', id)
      .single();
    
    if (checkError || !existingOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // First delete order items (due to foreign key constraint)
    const { error: itemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', id);
    
    if (itemsError) throw itemsError;
    
    // Then delete the order
    const { error: orderError } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);
    
    if (orderError) throw orderError;
    
    // Broadcast deletion to all clients via socket
    io.emit('order:deleted', { id });
    
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset pending/making orders (admin action) - keeps completed orders for statistics
app.delete('/api/orders/reset', requireAdmin, async (req, res) => {
  try {
    // Get IDs of orders that are NOT done (pending, making, cancelled)
    const { data: ordersToDelete, error: fetchError } = await supabase
      .from('orders')
      .select('id')
      .neq('status', 'done');
    
    if (fetchError) throw fetchError;
    
    const orderIds = ordersToDelete.map(o => o.id);
    
    if (orderIds.length > 0) {
      // Delete order items for those orders
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .in('order_id', orderIds);
      
      if (itemsError) throw itemsError;
      
      // Delete the orders
      const { error: ordersError } = await supabase
        .from('orders')
        .delete()
        .in('id', orderIds);
      
      if (ordersError) throw ordersError;
    }
    
    // Broadcast reset to all clients
    io.emit('orders:reset');
    
    res.json({ message: 'Đã reset đơn hàng (giữ lại đơn hoàn thành cho thống kê)' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== Socket.IO Events ==============

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Client can join specific rooms for targeted updates
  socket.on('join:customer', (customerName) => {
    socket.join(`customer:${customerName}`);
    console.log(`${customerName} joined their customer room`);
  });
  
  socket.on('join:admin', () => {
    socket.join('admin');
    console.log('Admin joined');
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ============== Start Server ==============

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // Lắng nghe trên tất cả network interfaces

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📱 Truy cập từ thiết bị khác: http://<IP_CỦA_BẠN>:${PORT}`);
});

