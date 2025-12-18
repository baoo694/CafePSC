import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Cho phép tất cả origin (IP nội bộ)
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors());
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

// Middleware kiểm tra admin token
const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Trong thực tế nên verify JWT, ở đây chỉ kiểm tra có token
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

// Update product availability
app.put('/api/products/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_available } = req.body;
    
    const { data, error } = await supabase
      .from('products')
      .update({ is_available })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
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

// Create new order
app.post('/api/orders', async (req, res) => {
  try {
    const { customer_name, phone, student_id, note, items } = req.body;
    
    // Build order data - only include phone/student_id if they exist in DB
    const orderData = {
      customer_name,
      note,
      status: 'pending',
    };
    
    // Add optional fields if provided
    if (phone) orderData.phone = phone;
    if (student_id) orderData.student_id = student_id;
    
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
    
    if (itemsError) throw itemsError;
    
    const fullOrder = { ...order, order_items: insertedItems };
    
    // Broadcast new order to all clients
    io.emit('order:new', fullOrder);
    
    res.json(fullOrder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
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

// Reset pending/making orders (admin action) - keeps completed orders for statistics
app.delete('/api/orders/reset', async (req, res) => {
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

