'use client'

import { useState } from 'react'
import Link from 'next/link'
import TriageExplanation from './TriageExplanation'
import OverrideForm from './OverrideForm'
import { PriorityBadge, StatusBadge, VerifiedBadge } from '../common/Badges'
import Icon from '../ui/Icon'
import { DANGERS, EVACUATION_ABILITY, INJURY_SEVERITIES, MEDICAL_NEEDS, STATUSES, VULNERABILITIES, type Status } from '@/lib/constants'
import { api, formatTime, formatWait, labelList, shortId, type ReportDetail } from '@/lib/client'

const NEXT_STATUS: Record<Status, Status[]> = {
  pending: ['investigating', 'assigned', 'cancelled'],
  investigating: ['assigned', 'resolved', 'cancelled'],
  assigned: ['resolved', 'investigating'],
  resolved: ['investigating'],
  cancelled: ['pending'],
}

const HISTORY_LABEL: Record<string, string> = {
  created: 'Report received',
  status: 'Status changed',
  verify: 'Verification changed',
  override: 'Priority overridden',
  override_cleared: 'Override removed',
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  if (children == null || children === '' || children === false) return null
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 py-1 text-sm">
      <dt className="font-semibold text-ink-600">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

const Unknown = ({ children }: { children: React.ReactNode }) => <em className="text-amber-700">{children}</em>

export default function CaseDetail({ report: r, actor, onChange, onAssign }: { report: ReportDetail; actor: string; onChange: (r: ReportDetail) => void; onAssign?: () => void }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const act = async (fn: () => Promise<{ report: ReportDetail }>) => {
    setBusy(true)
    setError(null)
    try {
      onChange((await fn()).report)
      setNote('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const closed = r.status === 'resolved' || r.status === 'cancelled'

  return (
    <div className="space-y-4">
      {/* Briefing header + quick actions stay in view while the details scroll */}
      <div className="clay sticky top-0 z-10 p-4 sm:p-5" style={{ borderRadius: 24 }}>
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={r.priority} />
          <StatusBadge status={r.status} />
          <VerifiedBadge verified={r.verified} />
          <span className="ml-auto text-sm font-bold text-ink-500">#{shortId(r.id)}</span>
        </div>
        <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
          {r.area} {r.location_address && <span className="text-base font-medium text-ink-600 sm:text-lg">{r.location_address}</span>}
        </h2>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-ink-600">
          <span>Received {formatTime(r.created_at)}</span>
          <span className="inline-flex items-center gap-1"><Icon name="clock" size={15} /> waiting {formatWait(r.triage.waitingMinutes)}</span>
          <Link className="inline-flex items-center gap-1 underline decoration-2 underline-offset-2" href="/map"><Icon name="map" size={15} /> View on map</Link>
        </p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Quick actions">
          {onAssign && (
            <button className="btn-primary btn-sm" disabled={busy || closed} onClick={onAssign}>
              <Icon name="boat" size={17} /> Assign rescue team
            </button>
          )}
          {NEXT_STATUS[r.status].map((s) => (
            <button key={s} className="btn-ghost btn-sm" disabled={busy} onClick={() => act(() => api.updateStatus(r.id, { status: s, note, by: actor }))}>
              Mark {STATUSES[s].toLowerCase()}
            </button>
          ))}
          <button className="btn-ghost btn-sm" disabled={busy} onClick={() => act(() => api.setVerified(r.id, { verified: !r.verified, by: actor }))}>
            <Icon name="shield" size={16} /> {r.verified ? 'Mark unverified' : 'Mark verified'}
          </button>
        </div>
        {error && <p className="field-error" role="alert"><Icon name="alert" size={16} className="mt-0.5 shrink-0" /> {error}</p>}
      </div>

      <section className="clay p-5">
        <h3 className="mb-3 text-xl font-semibold">Why this priority?</h3>
        <TriageExplanation report={r} />
      </section>

      <section className="clay p-5">
        <h3 className="mb-2 text-xl font-semibold">Reported details</h3>
        <dl>
          <Row label="People">{r.people_count ?? <Unknown>unknown</Unknown>}</Row>
          <Row label="Dangers">{r.dangers.length ? labelList(r.dangers, DANGERS) : <Unknown>not reported</Unknown>}</Row>
          <Row label="Description">{r.danger_details}</Row>
          <Row label="Injuries">
            {INJURY_SEVERITIES[r.injury_severity]}
            {r.injury_count ? ` · ${r.injury_count} injured` : ''}
            {r.injury_details ? ` · ${r.injury_details}` : ''}
          </Row>
          <Row label="Medical needs">{labelList(r.medical_need_types, MEDICAL_NEEDS)}</Row>
          <Row label="Medical details">{r.medical_needs}</Row>
          <Row label="Evacuation">{EVACUATION_ABILITY[r.can_evacuate]}</Row>
          <Row label="Vulnerable">{labelList(r.vulnerabilities, VULNERABILITIES)}</Row>
          <Row label="Location">
            {r.location_lat.toFixed(5)}, {r.location_lng.toFixed(5)} (
            {r.location_source === 'gps' ? `GPS${r.location_accuracy_m ? `, about ${r.location_accuracy_m} m` : ''}` : 'selected on map'})
          </Row>
          <Row label="Contact">{r.contact_info || <span className="text-ink-500">none given</span>}</Row>
        </dl>
      </section>

      <section className="clay space-y-3 p-5">
        <h3 className="text-xl font-semibold">Add a note or change the priority</h3>
        <div>
          <label className="label" htmlFor="case-note">Note for the history (optional)</label>
          <input id="case-note" className="input" placeholder="Saved with the next status or verification change" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </div>
        <div className="border-t border-sand-200 pt-3">
          <p className="label">Change priority</p>
          <OverrideForm key={r.id + r.updated_at} report={r} actor={actor} onSaved={onChange} />
        </div>
      </section>

      <section className="clay p-5">
        <h3 className="mb-3 text-xl font-semibold">History</h3>
        <ol className="relative space-y-4 border-l-2 border-sand-300 pl-5">
          {[...r.history].reverse().map((h) => (
            <li key={h.id} className="relative text-[15px]">
              <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-sand-100 bg-ink-800" aria-hidden="true" />
              <p>
                <strong>{HISTORY_LABEL[h.action] || h.action}</strong>
                {h.from_value != null && h.to_value != null && <span className="text-ink-700"> · {h.from_value} to {h.to_value}</span>}
              </p>
              {h.note && <p className="text-ink-700">{h.note}</p>}
              <p className="text-sm text-ink-600">{formatTime(h.created_at)} · {h.actor}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
