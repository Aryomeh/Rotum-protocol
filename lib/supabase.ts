import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client (safe — anon key only)
// Used in client components and hooks
export const supabase = createClient(supabaseUrl, supabaseAnon)

// Server/admin client — only used in API routes (server-side)
// This function is called only on the server so the service key
// is never bundled into client-side JavaScript
export function getSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
