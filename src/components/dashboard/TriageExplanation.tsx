import { PriorityBadge } from '../common/Badges'
import Icon from '@/components/ui/Icon'
import { PRIORITY_STYLES } from '@/lib/client'
import { TRIAGE_RULES } from '@/lib/triageRules'
import type { TriagedReport } from '@/lib/types'

const { thresholds } = TRIAGE_RULES

// "Why is this case ranked here?" - every point in the score is listed with its reason.
export default function TriageExplanation({ report }: { report: TriagedReport }) {
  const { triage } = report
  const max = Math.max(...triage.factors.map((f) => f.points), 1)
  const barColor = PRIORITY_STYLES[triage.suggestedPriority].color

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-sm font-semibold text-ink-700">Suggested</span>
        <PriorityBadge priority={triage.suggestedPriority} />
        <span className="font-display text-lg font-semibold">
          {triage.score} <span className="font-sans text-sm font-semibold text-ink-600">points</span>
        </span>
        {report.overridden && (
          <>
            <Icon name="arrow" size={16} className="text-ink-500" />
            <span className="text-sm font-bold text-ink-800">Set by a responder</span>
            <PriorityBadge priority={report.priority} />
          </>
        )}
      </div>

      <p className="text-[15px] text-ink-800">{triage.summary}</p>

      {triage.factors.length ? (
        <ul className="divide-y divide-sand-200" aria-label="Factors behind the score">
          {triage.factors.map((f) => (
            <li key={f.key} className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-1 py-2.5">
              <div className="min-w-0">
                <p className="font-bold">{f.category}</p>
                <p className="text-sm text-ink-700">{f.detail}</p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <div className="h-2.5 w-16 overflow-hidden rounded-full bg-sand-200" aria-hidden="true">
                  <div className="status-fill h-full rounded-full" style={{ width: `${(f.points / max) * 100}%`, background: barColor }} />
                </div>
                <span className="w-9 text-right font-display text-lg font-semibold">+{f.points}</span>
              </div>
            </li>
          ))}
          <li className="flex items-center justify-between py-2.5">
            <span className="text-sm font-bold text-ink-700">Total score</span>
            <span className="font-display text-xl font-semibold">{triage.score}</span>
          </li>
        </ul>
      ) : (
        <p className="text-sm text-ink-600">No risk factors were reported.</p>
      )}

      {!!triage.safetyRules.length && (
        <div className="flex gap-3 rounded-2xl border-2 border-critical bg-critical-100 p-3.5 text-sm text-ink-900" role="note">
          <Icon name="alert" size={20} className="mt-0.5 shrink-0 text-critical-700" />
          <div>
            <p className="font-bold">Safety rule applied</p>
            {triage.safetyRules.map((r) => (
              <p key={r}>{r}</p>
            ))}
          </div>
        </div>
      )}

      {!!triage.flags.length && (
        <div className="flex gap-3 rounded-2xl bg-warning-100 p-3.5 text-sm text-ink-900" role="note">
          <Icon name="info" size={20} className="mt-0.5 shrink-0 text-warning-700" />
          <div>
            <p className="font-bold">Check before acting</p>
            <ul className="list-disc pl-5">
              {triage.flags.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <p className="text-xs text-ink-600">
        Thresholds: Critical {thresholds.critical} or more, High {thresholds.high}, Medium {thresholds.medium}. This is a suggestion ({triage.version}); the
        responder makes the final decision.{' '}
        <a className="font-bold underline" href="/api/triage/rules" target="_blank" rel="noreferrer">
          See all rules
        </a>
      </p>
    </div>
  )
}
