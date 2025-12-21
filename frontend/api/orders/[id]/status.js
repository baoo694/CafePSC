import { getAdminSupabaseClient } from '../../../lib/supabase.js';
import { verifyAdminToken } from '../../../lib/auth.js';
import { requireCSRF } from '../../../lib/csrf.js';

// Valid order statuses
const VALID_STATUSES = ['pending', 'making', 'done', 'cancelled'];

export default async function handler(req, res) {
  // CORS headers với credentials support
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

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

    // Verify CSRF protection
    const csrfCheck = requireCSRF(req, allowedOrigins);
    if (!csrfCheck.valid) {
      return res.status(403).json({ error: 'CSRF validation failed: ' + csrfCheck.error });
    }

    try {
      // Validate input
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'Invalid order ID' });
      }

      const { status } = req.body;
      
      // Validate status
      if (!status || typeof status !== 'string') {
        return res.status(400).json({ error: 'Status is required' });
      }
      
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ 
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` 
        });
      }

      const adminSupabase = getAdminSupabaseClient();
      const { data, error } = await adminSupabase
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
      
      if (!data) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}


