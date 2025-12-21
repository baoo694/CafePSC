import { getAdminSupabaseClient } from '../../lib/supabase.js';
import { verifyAdminToken } from '../../lib/auth.js';
import { requireCSRF } from '../../lib/csrf.js';

function setCORSHeaders(res, req, methods = 'DELETE, OPTIONS') {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (!origin && allowedOrigins.length === 0) {
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
    return;
  }
  
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') {
      setCORSHeaders(res, req);
      return res.status(200).end();
    }

    if (req.method === 'DELETE') {
      setCORSHeaders(res, req, 'DELETE, OPTIONS');
      
      const authCheck = verifyAdminToken(req);
      if (!authCheck.valid) {
        return res.status(401).json({ error: 'Unauthorized: ' + authCheck.error });
      }

      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
      const csrfCheck = requireCSRF(req, allowedOrigins);
      if (!csrfCheck.valid) {
        return res.status(403).json({ error: 'CSRF validation failed: ' + csrfCheck.error });
      }

      try {
        const id = parseInt(req.query.id);
        if (!id || isNaN(id)) {
          return res.status(400).json({ error: 'Invalid order ID' });
        }

        const adminSupabase = getAdminSupabaseClient();
        const { data: existingOrder, error: checkError } = await adminSupabase
          .from('orders')
          .select('id')
          .eq('id', id)
          .single();

        if (checkError || !existingOrder) {
          return res.status(404).json({ error: 'Order not found' });
        }

        const { error: itemsError } = await adminSupabase
          .from('order_items')
          .delete()
          .eq('order_id', id);

        if (itemsError) throw itemsError;

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
  } catch (error) {
    console.error('API route error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
