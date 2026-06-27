import { createClient } from '@supabase/supabase-js'

console.log('SUPABASE URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log(
  'SUPABASE ANON:',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20)
)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnon)

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseService,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)