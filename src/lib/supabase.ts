import { createClient } from '@supabase/supabase-js'

// With no Supabase project configured (pure demo mode) the app must still start, so fall back to a
// placeholder that is never contacted: the API routes use the in-memory demo database instead.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo-mode-placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
