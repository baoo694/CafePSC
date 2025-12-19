import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'DELETE') {
    try {
      // Get IDs of orders that are NOT done
      const { data: ordersToDelete, error: fetchError } = await supabase
        .from('orders')
        .select('id')
        .neq('status', 'done');

      if (fetchError) throw fetchError;

      const orderIds = ordersToDelete.map(o => o.id);

      if (orderIds.length > 0) {
        // Delete order items
        const { error: itemsError } = await supabase
          .from('order_items')
          .delete()
          .in('order_id', orderIds);

        if (itemsError) throw itemsError;

        // Delete orders
        const { error: ordersError } = await supabase
          .from('orders')
          .delete()
          .in('id', orderIds);

        if (ordersError) throw ordersError;
      }

      return res.status(200).json({ message: 'Đã reset đơn hàng' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}


