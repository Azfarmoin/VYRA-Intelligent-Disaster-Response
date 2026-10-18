'use client'

import { useId, useState } from 'react'
import Icon from '@/components/ui/Icon'
import { PRIORITIES, PRIORITY_LABELS, type Priority } from '@/lib/constants'
import { api, ApiError, type ReportDetail } from '@/lib/client'

// Human-in-the-loop: a responder can set a different priority, but must say why.
export default function OverrideForm({ report, actor, onSaved }: { report: ReportDetail; actor: string; onSaved: (r: ReportDetail) => void }) {
  const uid = useId()
  const [priority, setPriority] = useState<Priority | ''>(report.overridden ? report.priority : '')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reasonOk = reason.trim().length >= 5

  const save = async (value: Priority | null) => {
    setBusy(true)
    setError(null)
    try {
      const { report: updated } = await api.overridePriority(report.id, { priority: value, reason, by: actor })
      setReason('')
      onSaved(updated)
    } catch (err) {
      setError(err instanceof ApiError ? err.details[0]?.message || err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      {report.overridden && report.triage_override && (
        <div className="clay-inset flex gap-3 p-3.5 text-sm">
          <Icon name="edit" size={18} className="mt-0.5 shrink-0" />
          <p>
            Set to <strong>{PRIORITY_LABELS[report.priority]}</strong> by {report.triage_override.by}: &ldquo;{report.triage_override.reason}&rdquo;
          </p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-[11rem_1fr]">
        <div>
          <label className="label" htmlFor={`${uid}-p`}>New priority</label>
          <select id={`${uid}-p`} className="input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            <option value="">Choose priority</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`${uid}-r`}>Reason</label>
          <input
            id={`${uid}-r`}
            className="input"
            placeholder="Required, kept in the history"
            value={reason}
            maxLength={500}
            aria-describedby={`${uid}-h`}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </div>
      <p id={`${uid}-h`} className="hint">Write at least 5 characters so the next dispatcher knows why.</p>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary btn-sm" disabled={busy || !priority || !reasonOk} onClick={() => priority && save(priority)}>
          Set priority
        </button>
        {report.overridden && (
          <button className="btn-ghost btn-sm" disabled={busy || !reasonOk} onClick={() => save(null)}>
            Return to suggested ({PRIORITY_LABELS[report.triage.suggestedPriority]})
          </button>
        )}
      </div>
      {error && (
        <p className="field-error" role="alert">
          <Icon name="alert" size={16} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}
