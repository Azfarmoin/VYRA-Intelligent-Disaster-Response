import { PRIORITY_LABELS, STATUSES, type Priority, type Status } from '@/lib/constants'
import { PRIORITY_STYLES, STATUS_STYLES } from '@/lib/client'
import Icon, { type IconName } from '@/components/ui/Icon'

// Urgency is encoded three ways: colour, a distinct shape and the word itself.
const PRIORITY_ICON: Record<Priority, IconName> = { critical: 'alert', high: 'flame', medium: 'clock', low: 'check' }

export function PriorityBadge({ priority, small = false }: { priority: Priority; small?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-extrabold ${PRIORITY_STYLES[priority].badge} ${small ? 'px-2.5 py-0.5 text-xs' : 'px-3.5 py-1.5 text-sm'}`}>
      <Icon name={PRIORITY_ICON[priority]} size={small ? 13 : 16} />
      {PRIORITY_LABELS[priority]}
    </span>
  )
}

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[status]}`}>{STATUSES[status]}</span>
}

export function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="pill bg-success-100 text-success-800"><Icon name="shield" size={13} /> Verified</span>
  ) : (
    <span className="pill bg-warning-100 text-warning-700"><Icon name="info" size={13} /> Not verified yet</span>
  )
}

export function UpdatedDot({ at, error }: { at: Date | null; error?: Error | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-600" title="Refreshes every 15 seconds" role="status">
      <span className={`h-2.5 w-2.5 rounded-full ${error ? 'bg-critical' : 'bg-success'}`} />
      {error ? 'Connection problem' : at ? `Updated ${at.toLocaleTimeString([], { timeStyle: 'short' })}` : 'Loading...'}
    </span>
  )
}

export function DemoModeBanner({ mode }: { mode?: string }) {
  if (mode !== 'demo') return null
  return (
    <div className="mx-auto mt-3 max-w-7xl px-3 sm:px-5">
      <p className="rounded-2xl bg-warning-100 px-4 py-2 text-center text-sm font-semibold text-ink-900" role="note">
        Demo mode: you are seeing simulated cases kept in memory. Nothing is saved to the database.
      </p>
    </div>
  )
}
