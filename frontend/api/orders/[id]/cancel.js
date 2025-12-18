import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      // Check if order is pending
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
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

