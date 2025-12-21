import { getAdminSupabaseClient } from '../../lib/supabase.js';
import { verifyAdminToken } from '../../lib/auth.js';
import { requireCSRF } from '../../lib/csrf.js';

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

  if (req.method === 'DELETE') {
    // Verify admin authentication
    const authCheck = verifyAdminToken(req);
    if (!authCheck.valid) {
      return res.status(401).json({ error: 'Unauthorized: ' + authCheck.error });
    }

    // Verify CSRF protection
    const csrfCheck = requireCSRF(req, allowedOrigins);
    if (!csrfCheck.valid) {
      // Log for debugging
      console.error('CSRF check failed:', {
        error: csrfCheck.error,
        hasOrigin: !!req.headers.origin,
        hasCSRFToken: !!req.headers['x-csrf-token'],
        hasCookie: !!req.headers.cookie,
        allowedOrigins
      });
      return res.status(403).json({ 
        error: 'CSRF validation failed: ' + csrfCheck.error,
        hint: 'Please try logging in again to get a new CSRF token'
      });
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


