import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { demoUsers, isDemoMode, plainClient, requireAdmin, serviceClient, type AccountRow } from '@/lib/adminAuth'

// Administrator-only account management.
//   GET  /api/admin/users   list accounts
//   POST /api/admin/users   create an account with any role (citizen, responder, admin)

const createSchema = z.object({
  full_name: z.string().trim().min(1, 'Enter the full name.').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(200),
  password: z.string().min(6, 'Use a password of at least 6 characters.').max(72, 'Use at most 72 characters.'),
  role: z.enum(['citizen', 'responder', 'admin']),
})

export async function GET(request: NextRequest) {
  const check = await requireAdmin(request)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  if (isDemoMode()) {
    const users: AccountRow[] = demoUsers().map((u) => ({ id: u.id, email: u.email, full_name: u.full_name, role: u.role, created_at: u.created_at ?? null }))
    return NextResponse.json({ users, mode: 'demo' })
  }
  const { data, error } = await (serviceClient() ?? plainClient()).from('profiles').select('id, email, full_name, role, created_at').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ users: data as AccountRow[], mode: 'supabase' })
}

export async function POST(request: NextRequest) {
  const check = await requireAdmin(request)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const parsed = createSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return NextResponse.json({ error: issue.message, details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) }, { status: 400 })
  }
  const { full_name, email, password, role } = parsed.data

  // Demo mode: in-memory accounts.
  if (isDemoMode()) {
    if (demoUsers().some((u) => u.email === email)) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    const user = { id: randomUUID(), email, full_name, role, password, created_at: new Date().toISOString() }
    demoUsers().push(user)
    return NextResponse.json({ user: { id: user.id, email, full_name, role, created_at: user.created_at }, confirmed: true }, { status: 201 })
  }

  // Real Supabase.
  const admin = serviceClient()
  let userId: string | null = null
  let confirmed = true

  if (admin) {
    // Preferred: the service key creates an already-confirmed account.
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })
    if (error) {
      const exists = /already|registered|exists/i.test(error.message)
      return NextResponse.json({ error: exists ? 'An account with this email already exists.' : error.message }, { status: exists ? 409 : 400 })
    }
    userId = data.user.id
  } else {
    // No service key: ordinary sign-up on a throw-away client (never touches the admin's own session).
    const { data, error } = await plainClient().auth.signUp({ email, password, options: { data: { full_name } } })
    if (error) {
      const exists = /already|registered|exists/i.test(error.message)
      return NextResponse.json({ error: exists ? 'An account with this email already exists.' : error.message }, { status: exists ? 409 : 400 })
    }
    // Supabase hides duplicates behind an empty identities list when email confirmation is on.
    if (!data.user || (data.user.identities && data.user.identities.length === 0)) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }
    userId = data.user.id
    confirmed = !!data.user.email_confirmed_at || !!data.session
  }

  const { error: profileError } = await (admin ?? plainClient()).from('profiles').upsert({ id: userId, email, full_name, role }, { onConflict: 'id' })
  if (profileError) {
    return NextResponse.json({ error: `The sign-in was created but the profile could not be saved: ${profileError.message}` }, { status: 500 })
  }
  return NextResponse.json({ user: { id: userId, email, full_name, role, created_at: new Date().toISOString() }, confirmed }, { status: 201 })
}
