import { getAdminSupabaseClient } from '../../lib/supabase.js';
import { verifyAdminToken } from '../../lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (req.method === 'PUT') {
    // Verify admin authentication
    const authCheck = verifyAdminToken(req);
    if (!authCheck.valid) {
      return res.status(401).json({ error: 'Unauthorized: ' + authCheck.error });
    }

    try {
      // Validate input
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'Invalid product ID' });
      }

      const { is_available } = req.body;
      
      // Validate is_available is boolean
      if (typeof is_available !== 'boolean') {
        return res.status(400).json({ error: 'is_available must be a boolean' });
      }

      const adminSupabase = getAdminSupabaseClient();
      const { data, error } = await adminSupabase
        .from('products')
        .update({ is_available })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      if (!data) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}


