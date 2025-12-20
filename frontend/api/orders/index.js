import { getSupabaseClient } from '../lib/supabase.js';

const supabase = getSupabaseClient();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET all orders
  if (req.method === 'GET') {
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
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // POST new order
  if (req.method === 'POST') {
    try {
      const { customer_name, phone, delivery_address, note, items } = req.body;

      const orderData = {
        customer_name,
        note,
        status: 'pending',
      };

      if (phone) orderData.phone = phone;
      if (delivery_address) orderData.delivery_address = delivery_address;

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

