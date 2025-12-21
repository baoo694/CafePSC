import { getAdminSupabaseClient } from '../lib/supabase.js';
import { verifyAdminToken } from '../lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'DELETE') {
    // Verify admin authentication
    const authCheck = verifyAdminToken(req);
    if (!authCheck.valid) {
      return res.status(401).json({ error: 'Unauthorized: ' + authCheck.error });
    }

    try {
      const adminSupabase = getAdminSupabaseClient();
      
      // Get IDs of orders that are NOT done
      const { data: ordersToDelete, error: fetchError } = await adminSupabase
        .from('orders')
        .select('id')
        .neq('status', 'done');

      if (fetchError) throw fetchError;

      const orderIds = ordersToDelete.map(o => o.id);

      if (orderIds.length > 0) {
        // Delete order items
        const { error: itemsError } = await adminSupabase
          .from('order_items')
          .delete()
          .in('order_id', orderIds);

        if (itemsError) throw itemsError;

        // Delete orders
        const { error: ordersError } = await adminSupabase
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


