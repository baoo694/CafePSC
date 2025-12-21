import { getAdminSupabaseClient } from '../../lib/supabase.js';
import { verifyAdminToken } from '../../lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (req.method === 'DELETE') {
    // Verify admin authentication
    const authCheck = verifyAdminToken(req);
    if (!authCheck.valid) {
      return res.status(401).json({ error: 'Unauthorized: ' + authCheck.error });
    }

    try {
      // Validate input
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'Invalid order ID' });
      }

      const adminSupabase = getAdminSupabaseClient();
      
      // Check if order exists
      const { data: existingOrder, error: checkError } = await adminSupabase
        .from('orders')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError || !existingOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // First delete order items (due to foreign key constraint)
      const { error: itemsError } = await adminSupabase
        .from('order_items')
        .delete()
        .eq('order_id', id);

      if (itemsError) throw itemsError;

      // Then delete the order
      const { error: orderError } = await adminSupabase
        .from('orders')
        .delete()
        .eq('id', id);

      if (orderError) throw orderError;

      return res.status(200).json({ message: 'Order deleted successfully' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}


