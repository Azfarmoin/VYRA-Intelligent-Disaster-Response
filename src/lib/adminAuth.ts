// Server-side helpers for the administrator "Accounts" feature (API routes only).
//
// Real Supabase mode: the browser sends its access token as `Authorization: Bearer <token>`. We ask
// Supabase who that token belongs to and read the role from `profiles`, so the browser cannot just
// claim to be an admin.
// Demo mode: accounts live in memory (see /api/demo/auth) and the session is a localStorage entry
// with no token, so the demo check is by email only. That is fine for an in-memory demo with fake
// data, and it is never used when a real Supabase project is configured.
import type { NextRequest } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getStore } from './db'
import { DEMO_ACCOUNTS, DEMO_PASSWORD, type DemoRole } from './demoAccounts'

export type AccountRole = DemoRole

export interface AccountRow {
  id: string
  email: string
  full_name: string | null
  role: AccountRole
  created_at: string | null
}

export type DemoUser = { id: string; email: string; full_name: string; role: DemoRole; password: string; blurb?: string; created_at?: string }

// Same store the demo sign-in route uses (kept on globalThis so both routes see the same list).
const g = globalThis as unknown as { __vyraDemoUsers?: DemoUser[] }
export const demoUsers = (): DemoUser[] => (g.__vyraDemoUsers ??= DEMO_ACCOUNTS.map((a) => ({ ...a, password: DEMO_PASSWORD })))

export const isDemoMode = () => getStore().mode === 'demo'

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const publishableKey = () => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }

/** A client that never stores a session, so creating someone else's account cannot sign the admin out. */
export function plainClient(): SupabaseClient {
  return createClient(url(), publishableKey(), noSession)
}

/** Privileged client, only when SUPABASE_SERVICE_ROLE_KEY is set on the server. Never expose this key to the browser. */
export function serviceClient(): SupabaseClient | null {
  return serviceKey() ? createClient(url(), serviceKey(), noSession) : null
}

export type AdminCheck = { ok: true; email: string } | { ok: false; status: number; error: string }

export async function requireAdmin(request: NextRequest): Promise<AdminCheck> {
  if (isDemoMode()) {
    const email = (request.headers.get('x-demo-admin') || '').trim().toLowerCase()
    const user = demoUsers().find((u) => u.email === email)
    if (!user) return { ok: false, status: 401, error: 'Sign in as an administrator first.' }
    if (user.role !== 'admin') return { ok: false, status: 403, error: 'Only administrators can manage accounts.' }
    return { ok: true, email: user.email }
  }

  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return { ok: false, status: 401, error: 'Sign in as an administrator first.' }
  const client = plainClient()
  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user) return { ok: false, status: 401, error: 'Your sign-in has expired. Sign in again.' }
  const { data: profile } = await (serviceClient() ?? client).from('profiles').select('role').eq('id', data.user.id).maybeSingle()
  if (profile?.role !== 'admin') return { ok: false, status: 403, error: 'Only administrators can manage accounts.' }
  return { ok: true, email: data.user.email ?? '' }
}
