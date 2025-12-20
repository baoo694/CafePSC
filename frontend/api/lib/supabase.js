import { createClient } from '@supabase/supabase-js';

// Shared Supabase client để tái sử dụng connections
// Giúp giảm số lượng connections mới được tạo
let supabaseClient = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        // Tối ưu hóa connection pooling
        db: {
          schema: 'public',
        },
        auth: {
          persistSession: false, // Không cần persist session trong serverless
          autoRefreshToken: false,
        },
        global: {
          headers: {
            'x-client-info': 'vercel-serverless',
          },
        },
      }
    );
  }
  return supabaseClient;
}

