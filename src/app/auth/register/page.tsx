'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthShell, { FieldError } from '@/components/auth/AuthShell'
import Icon from '@/components/ui/Icon'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Administrators are never self-service: an existing admin promotes people. Responder access is
// requested here and should be confirmed by an administrator.
type Role = 'citizen' | 'responder'

const ROLES: { value: Role; title: string; text: string }[] = [
  { value: 'citizen', title: 'Citizen', text: 'Ask for help and follow your reports.' },
  { value: 'responder', title: 'Responder', text: 'Work the dispatcher queue, map and missions.' },
]

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'citizen' as Role,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'fullName' | 'email' | 'password' | 'confirmPassword', string>>>({})
  const errorRef = useRef<HTMLDivElement>(null)
  const [demo, setDemo] = useState(false)
  useEffect(() => {
    fetch('/api/demo/auth').then((r) => r.json()).then((d) => setDemo(!!d.demo)).catch(() => undefined)
  }, [])
  const set = (k: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, [k]: e.target.value })

  const failWith = (message: string) => {
    setError(message)
    setTimeout(() => errorRef.current?.focus(), 0)
  }
  const mismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword
  const matches = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const errs: typeof fieldErrors = {}
    if (!formData.fullName.trim()) errs.fullName = 'Enter your full name.'
    if (!formData.email.trim()) errs.email = 'Enter your email address.'
    else if (!EMAIL_RE.test(formData.email.trim())) errs.email = 'Enter a valid email address, like name@example.com.'
    if (formData.password.length < 6) errs.password = 'Use at least 6 characters.'
    if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Passwords do not match.'
    setFieldErrors(errs)
    const firstBad = (['fullName', 'email', 'password', 'confirmPassword'] as const).find((k) => errs[k])
    if (firstBad) {
      document.getElementById(firstBad)?.focus()
      return
    }

    setLoading(true)
    try {
      if (demo) {
        const res = await fetch('/api/demo/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'register', email: formData.email, password: formData.password, full_name: formData.fullName, role: formData.role }) })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) return failWith(body.error || 'Registration failed.')
        router.push('/auth/login')
        return
      }
      // Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password
      })

      if (authError) {
        failWith(authError.message)
        return
      }

      if (authData.user) {
        // Create profile record
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            full_name: formData.fullName.trim(),
            email: formData.email.trim(),
            role: formData.role
          })

        if (profileError) {
          failWith('Your account was created but your profile could not be saved. Please try again.')
          return
        }

        // Redirect to login
        router.push('/auth/login')
      }
    } catch (err) {
      failWith('Registration failed. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell variant="register" title="Create your account" intro="It takes a minute. You can ask for help without an account too.">
      {error && (
        <div ref={errorRef} tabIndex={-1} role="alert" className="mb-5 flex items-start gap-2 rounded-2xl border-2 border-critical-700 bg-critical-100 p-3.5 text-[15px] font-bold outline-none">
          <Icon name="alert" size={18} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="fullName" className="label">Full name</label>
          <input id="fullName" type="text" autoComplete="name" value={formData.fullName} onChange={set('fullName')} className="input" aria-invalid={!!fieldErrors.fullName} aria-describedby={fieldErrors.fullName ? 'fullName-error' : undefined} />
          <FieldError id="fullName-error">{fieldErrors.fullName}</FieldError>
        </div>

        <div>
          <label htmlFor="email" className="label">Email address</label>
          <input id="email" type="email" autoComplete="email" value={formData.email} onChange={set('email')} className="input" placeholder="you@example.com" aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? 'email-error' : undefined} />
          <FieldError id="email-error">{fieldErrors.email}</FieldError>
        </div>

        <fieldset>
          <legend className="label">How will you use VYRA?</legend>
          <div className="grid gap-2.5">
            {ROLES.map((r) => (
              <label key={r.value} className="chip !items-start !py-3">
                <input type="radio" name="role" value={r.value} checked={formData.role === r.value} onChange={() => setFormData({ ...formData, role: r.value })} className="mt-0.5" />
                <span>
                  <span className="block font-bold">{r.title}</span>
                  <span className="block text-sm font-normal text-ink-700">{r.text}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="password" className="label">Password</label>
          <input id="password" type="password" autoComplete="new-password" value={formData.password} onChange={set('password')} className="input" aria-invalid={!!fieldErrors.password} aria-describedby={fieldErrors.password ? 'password-error password-hint' : 'password-hint'} />
          <p id="password-hint" className="hint mt-1.5">At least 6 characters.</p>
          <FieldError id="password-error">{fieldErrors.password}</FieldError>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="label">Confirm password</label>
          <input id="confirmPassword" type="password" autoComplete="new-password" value={formData.confirmPassword} onChange={set('confirmPassword')} className="input" aria-invalid={!!fieldErrors.confirmPassword || mismatch} aria-describedby="confirm-status" />
          <p id="confirm-status" className={`mt-1.5 flex items-center gap-1.5 text-sm font-semibold ${matches ? 'text-success-800' : mismatch ? 'text-critical-700' : 'sr-only'}`} aria-live="polite">
            {matches && <><Icon name="check" size={16} /> Passwords match.</>}
            {mismatch && <><Icon name="alert" size={16} /> Passwords do not match yet.</>}
          </p>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base">
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-ink-700">
        Already have an account?{' '}
        <Link href="/auth/login" className="font-bold text-ink-900 underline decoration-2 underline-offset-4">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
