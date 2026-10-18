import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getStore } from '@/lib/db'
import { DEMO_ACCOUNTS, DEMO_PASSWORD, type DemoRole } from '@/lib/demoAccounts'

// Demo sign-in. Only available in demo mode; with a real Supabase project this answers { demo: false }.
const g = globalThis as unknown as { __vyraDemoUsers?: { id: string; email: string; full_name: string; role: DemoRole; password: string }[] }
const users = () => (g.__vyraDemoUsers ??= DEMO_ACCOUNTS.map((a) => ({ ...a, password: DEMO_PASSWORD })))
const isDemo = () => getStore().mode === 'demo'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function GET() {
  if (!isDemo()) return NextResponse.json({ demo: false })
  return NextResponse.json({
    demo: true,
    password: DEMO_PASSWORD,
    accounts: DEMO_ACCOUNTS.map(({ email, full_name, role, blurb }) => ({ email, full_name, role, blurb })),
  })
}

export async function POST(request: NextRequest) {
  if (!isDemo()) return NextResponse.json({ error: 'Demo accounts are only available in demo mode.' }, { status: 404 })
  const body = await request.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')

  if (body.action === 'register') {
    const full_name = String(body.full_name ?? '').trim()
    const role: DemoRole = body.role === 'responder' ? 'responder' : 'citizen' // admin is never self-service
    if (!full_name) return NextResponse.json({ error: 'Enter your full name.' }, { status: 400 })
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
    if (password.length < 6) return NextResponse.json({ error: 'Use a password of at least 6 characters.' }, { status: 400 })
    if (users().some((u) => u.email === email)) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    users().push({ id: randomUUID(), email, full_name, role, password })
    return NextResponse.json({ ok: true }, { status: 201 })
  }

  const user = users().find((u) => u.email === email && u.password === password)
  if (!user) return NextResponse.json({ error: 'Invalid login credentials' }, { status: 401 })
  return NextResponse.json({ user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, demo: true } })
}
