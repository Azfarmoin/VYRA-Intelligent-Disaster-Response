'use client'

<<<<<<< HEAD
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from '@/lib/session'
import Icon, { type IconName } from '@/components/ui/Icon'

const links: { href: string; label: string; icon: IconName }[] = [
  { href: '/dashboard', label: 'Dispatcher', icon: 'list' },
  { href: '/map', label: 'Map', icon: 'map' },
  { href: '/dispatches', label: 'Missions', icon: 'boat' },
  { href: '/resources', label: 'Supplies', icon: 'box' },
]
// Shown to administrators only.
const adminLinks: { href: string; label: string; icon: IconName }[] = [{ href: '/admin/users', label: 'Accounts', icon: 'users' }]

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
        <rect width="36" height="36" rx="12" fill="#182B3A" />
        <circle cx="18" cy="18" r="9" fill="none" stroke="#F47755" strokeWidth="5.500" />
        <path d="M18 6.500v5m0 13v5M6.500 18h5m13 0h5" stroke="#F6F0E7" strokeWidth="3" />
        <circle cx="18" cy="18" r="2.600" fill="#E9B94D" />
      </svg>
      <span className={`font-display text-[22px] font-semibold tracking-tight ${dark ? 'text-white' : 'text-ink-900'}`}>VYRA</span>
    </span>
  )
}

export default function SiteHeader() {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const { user } = useSession()
  const navLinks = user?.role === 'admin' ? [...links, ...adminLinks] : links
  const active = (href: string) => path === href || path.startsWith(`${href}/`)

  return (
    <header className="sticky top-0 z-[1100] px-3 pt-3 sm:px-5">
      <div className="clay-sm mx-auto flex max-w-7xl items-center gap-2 px-3 py-2 sm:px-4" style={{ borderRadius: 24 }}>
        <Link href="/" aria-label="VYRA home" className="mr-1 shrink-0 rounded-xl p-1">
          <Logo />
        </Link>
        <nav className="ml-3 hidden items-center gap-1 md:flex" aria-label="Main">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active(l.href) ? 'page' : undefined}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition ${
                active(l.href) ? 'clay-inset text-ink-900' : 'text-ink-600 hover:bg-sand-200/70 hover:text-ink-900'
              }`}
            >
              <Icon name={l.icon} size={18} />
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <span className="hidden items-center gap-2 text-sm sm:flex">
              <span className="max-w-[10rem] truncate font-bold" title={`${user.full_name} (${user.role})`}>{user.full_name}</span>
              <button type="button" onClick={() => signOut()} className="rounded-xl px-2.5 py-2 font-bold text-ink-700 underline decoration-2 underline-offset-4 hover:bg-sand-200/70">Sign out</button>
            </span>
          ) : (
            <Link href="/auth/login" className="hidden rounded-xl px-3 py-2 text-sm font-bold text-ink-700 hover:bg-sand-200/70 sm:block">
              Sign in
            </Link>
          )}
          <Link href="/report" className="btn-primary btn-sm">
            <Icon name="alert" size={18} />
            <span>Report<span className="hidden sm:inline"> an emergency</span></span>
          </Link>
          <button
            type="button"
            className="btn-ghost btn-sm md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? 'close' : 'menu'} size={20} />
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Main" className="clay mx-auto mt-2 max-w-7xl space-y-1 p-3 md:hidden" style={{ borderRadius: 22 }}>
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              aria-current={active(l.href) ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 font-bold ${active(l.href) ? 'clay-inset' : ''}`}
            >
              <Icon name={l.icon} />
              {l.label}
            </Link>
          ))}
          {user ? (
            <button type="button" onClick={() => { setOpen(false); signOut() }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-bold">
              <Icon name="user" /> Sign out ({user.full_name})
            </button>
          ) : (
            <Link href="/auth/login" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 font-bold">
              <Icon name="user" /> Sign in
            </Link>
          )}
        </nav>
      )}
=======
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/report', label: 'Request help', urgent: true },
  { href: '/dashboard', label: 'Triage dashboard' },
  { href: '/map', label: 'Live map' },
  { href: '/resources', label: 'Resources' },
]

export default function SiteHeader() {
  const path = usePathname()
  return (
    <header className="sticky top-0 z-[1100] border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-gray-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 font-black text-white">V</span>
          <span className="text-lg font-bold tracking-tight">VYRA</span>
        </Link>
        <nav className="flex gap-1 overflow-x-auto">
          {links.map((l) => {
            const active = path === l.href || path.startsWith(`${l.href}/`)
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                  active ? 'bg-primary-100 text-primary-800' : l.urgent ? 'text-red-700 hover:bg-red-50' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {l.label}
              </Link>
            )
          })}
        </nav>
      </div>
>>>>>>> origin/main
    </header>
  )
}
