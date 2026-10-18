'use client'

// Stage 6/7 - Dispatcher workspace: a ranked queue on the left, the selected incident's briefing on the right.
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SiteHeader from '@/components/common/SiteHeader'
import { DemoModeBanner, UpdatedDot } from '@/components/common/Badges'
import TriageQueue from '@/components/dashboard/TriageQueue'
import CaseDetail from '@/components/dashboard/CaseDetail'
import AssignTeamModal from '@/components/AssignTeamModal'
import { useSession } from '@/lib/session'
import Icon from '@/components/ui/Icon'
import { EmptyCrate } from '@/components/ui/Illustrations'
import { AREAS, PRIORITIES, PRIORITY_LABELS, STATUSES, type Priority } from '@/lib/constants'
import { api, PRIORITY_STYLES, usePolledReports, type ReportDetail } from '@/lib/client'

function readActor() {
  try {
    return localStorage.getItem('vyra.actor') || ''
  } catch {
    return ''
  }
}

function Dashboard() {
  const router = useRouter()
  const selectedId = useSearchParams().get('id')
  const [area, setArea] = useState('')
  const [priority, setPriority] = useState<Priority | ''>('')
  const [status, setStatus] = useState('open')
  const [actor, setActor] = useState('')
  const { user } = useSession()
  const [selected, setSelected] = useState<ReportDetail | null>(null)
  const [assigning, setAssigning] = useState(false)

  const query = useMemo(() => ({ area, priority, status }), [area, priority, status])
  const { reports, summary, mode, error, loading, lastUpdated, reload } = usePolledReports(api.triageQueue, query)

  // A name typed here wins; otherwise act as the signed-in person.
  useEffect(() => setActor(readActor() || user?.full_name || ''), [user])
  const saveActor = (v: string) => {
    setActor(v)
    try {
      localStorage.setItem('vyra.actor', v)
    } catch {
      /* storage unavailable - name just won't be remembered */
    }
  }

  // Load the selected case (with history); refresh it whenever the queue refreshes.
  const loadSelected = useCallback(() => {
    if (!selectedId) return setSelected(null)
    api
      .getReport(selectedId)
      .then((r) => setSelected(r.report))
      .catch(() => setSelected(null))
  }, [selectedId])
  useEffect(loadSelected, [loadSelected, lastUpdated])

  const select = (id: string | null) => router.push(id ? `/dashboard?id=${id}` : '/dashboard', { scroll: false })
  const total = summary?.total ?? 0

  return (
    <div className="page">
      <SiteHeader />
      <DemoModeBanner mode={mode} />
      <main id="main" className="container-x py-5">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h1 className="text-3xl font-semibold sm:text-4xl">Dispatcher workspace</h1>
            <p className="text-ink-700">Cases are ranked by urgency, with the reasons shown. You make the final call.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <UpdatedDot at={lastUpdated} error={error} />
            <label className="flex items-center gap-2 text-sm font-bold" htmlFor="actor">
              Acting as
              <input id="actor" className="input !w-44 !py-2" value={actor} onChange={(e) => saveActor(e.target.value)} placeholder="Your name" autoComplete="name" />
            </label>
          </div>
        </div>

        {/* Filters: urgency doubles as the legend and shows how the queue is made up */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="clay-inset flex flex-wrap gap-1 p-1" role="group" aria-label="Filter by urgency" style={{ borderRadius: 20 }}>
            <button type="button" aria-pressed={priority === ''} onClick={() => setPriority('')} className={`rounded-2xl px-3.5 py-2 text-sm font-bold ${priority === '' ? 'clay-sm' : 'text-ink-600'}`}>
              All <span className="tabular-nums text-ink-600">{total}</span>
            </button>
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={priority === p}
                onClick={() => setPriority(priority === p ? '' : p)}
                className={`flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-bold ${priority === p ? 'clay-sm' : 'text-ink-600'}`}
              >
                <span className="h-3 w-3 rounded-full border border-ink-900/25" style={{ background: PRIORITY_STYLES[p].color }} aria-hidden="true" />
                {PRIORITY_LABELS[p]} <span className="tabular-nums">{summary?.byPriority[p] ?? 0}</span>
              </button>
            ))}
          </div>
          <select className="input !w-44" value={area} onChange={(e) => setArea(e.target.value)} aria-label="Area">
            <option value="">All areas</option>
            {AREAS.map((a) => (
              <option key={a.name} value={a.name}>{a.name}</option>
            ))}
            <option value="Unassigned">Unassigned</option>
          </select>
          <select className="input !w-44" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="open">Open cases</option>
            <option value="">All statuses</option>
            {Object.entries(STATUSES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {summary && (
            <p className="text-sm font-semibold text-ink-600">
              {summary.unverified} not verified, {summary.overridden} changed by a responder
            </p>
          )}
        </div>
        {error && <p className="field-error mt-3" role="alert"><Icon name="alert" size={16} className="mt-0.5 shrink-0" /> {error.message}</p>}

        {/* The desk: both panes scroll on their own so the queue never loses its place */}
        <div className="mt-4 grid gap-5 lg:h-[calc(100vh-17rem)] lg:min-h-[480px] lg:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
          <section aria-label="Case queue" className={`min-h-0 overflow-y-auto pb-6 pr-1 ${selectedId ? 'hidden lg:block' : ''}`}>
            <TriageQueue reports={reports} selectedId={selectedId} onSelect={select} loading={loading} />
          </section>
          <section aria-label="Selected case" className="min-h-0 overflow-y-auto pb-6">
            {selected ? (
              <>
                <button className="btn-ghost btn-sm mb-3 lg:hidden" onClick={() => select(null)}>
                  <Icon name="arrow" size={16} className="rotate-180" /> Back to queue
                </button>
                <CaseDetail
                  report={selected}
                  actor={actor.trim() || 'responder'}
                  onAssign={() => setAssigning(true)}
                  onChange={(updated) => {
                    setSelected(updated)
                    reload()
                  }}
                />
              </>
            ) : (
              <div className="clay hidden h-full flex-col items-center justify-center gap-4 p-10 text-center lg:flex">
                <EmptyCrate className="w-44" />
                <h2 className="text-2xl font-semibold">{selectedId ? 'Loading the case...' : 'Pick a case from the queue'}</h2>
                <p className="max-w-sm text-ink-700">The case opens here with the reasons for its ranking, quick actions and its full history.</p>
              </div>
            )}
          </section>
        </div>
      </main>

      {assigning && selected && (
        <AssignTeamModal
          reportId={selected.id}
          reportLabel={`${selected.location_address || selected.area || 'Unknown location'} · ${selected.people_count ?? '?'} people · ${PRIORITY_LABELS[selected.priority]}`}
          onClose={() => setAssigning(false)}
          onAssigned={() => {
            setAssigning(false)
            loadSelected()
            reload()
          }}
        />
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense>
      <Dashboard />
    </Suspense>
  )
}
