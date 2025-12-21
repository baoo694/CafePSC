import { createClient } from '@supabase/supabase-js';

// Shared Supabase client để tái sử dụng connections
// Giúp giảm số lượng connections mới được tạo
let supabaseClient = null;
let adminSupabaseClient = null;

// Client cho public operations (sử dụng ANON_KEY)
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

// Client cho admin operations (sử dụng SERVICE_ROLE_KEY)
// Service Role Key có quyền bypass RLS, chỉ dùng trong server-side API routes
export function getAdminSupabaseClient() {
  if (!adminSupabaseClient) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. Required for admin operations.');
    }
    
    adminSupabaseClient = createClient(
      process.env.SUPABASE_URL,
      serviceRoleKey, // Service Role Key bypasses RLS
      {
        db: {
          schema: 'public',
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            'x-client-info': 'vercel-serverless-admin',
          },
        },
      }
    );
  }
  return adminSupabaseClient;
}


