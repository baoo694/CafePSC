import { getAdminSupabaseClient } from '../../../lib/supabase.js';
import { verifyAdminToken } from '../../../lib/auth.js';
import { requireCSRF } from '../../../lib/csrf.js';

export default async function handler(req, res) {
  // CORS headers với credentials support
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

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

    // Verify CSRF protection
    const csrfCheck = requireCSRF(req, allowedOrigins);
    if (!csrfCheck.valid) {
      // Log for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.error('CSRF validation failed:', csrfCheck.error);
      }
      return res.status(403).json({ 
        error: 'CSRF validation failed: ' + csrfCheck.error,
        hint: 'Please log out and log in again if you recently upgraded to JWT tokens.'
      });
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


