'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import ChoiceGroup from './ChoiceGroup'
import type { PickedLocation } from './LocationPicker'
import { AREAS, DANGERS, EVACUATION_ABILITY, INJURY_SEVERITIES, MEDICAL_NEEDS, VULNERABILITIES } from '@/lib/constants'
import { api, ApiError, labelList, type PublicReport } from '@/lib/client'
import Icon from '@/components/ui/Icon'

const LocationPicker = dynamic(() => import('./LocationPicker'), {
  ssr: false,
  loading: () => <div className="clay-inset h-64 animate-pulse" />,
})

const newClientId = () =>
  globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`

const EMPTY = {
  location: null as PickedLocation | null,
  locationAddress: '',
  area: '',
  peopleCount: '',
  dangers: [] as string[],
  dangerDetails: '',
  injurySeverity: '',
  injuryCount: '',
  injuryDetails: '',
  medicalNeedTypes: [] as string[],
  medicalNeeds: '',
  canEvacuate: '',
  vulnerabilities: [] as string[],
  contactName: '',
  contactPhone: '',
}
type FormState = typeof EMPTY

// Unanswered questions are sent as "unknown" (never "no"), so the triage engine
// does not mistake missing information for low risk.
export function toPayload(f: FormState, clientId: string, reporterId: string | null) {
  const num = (v: string) => (v.trim() === '' ? null : Number(v))
  return {
    client_id: clientId,
    reporter_id: reporterId,
    location_lat: f.location!.lat,
    location_lng: f.location!.lng,
    location_source: f.location!.source,
    location_accuracy_m: f.location!.accuracyM ?? null,
    location_address: f.locationAddress,
    area: f.area || null,
    people_count: num(f.peopleCount),
    dangers: f.dangers,
    danger_details: f.dangerDetails,
    injury_severity: f.injurySeverity || 'unknown',
    injury_count: num(f.injuryCount),
    injury_details: f.injuryDetails,
    medical_need_types: f.medicalNeedTypes,
    medical_needs: f.medicalNeeds,
    can_evacuate: f.canEvacuate || 'unknown',
    vulnerabilities: f.vulnerabilities,
    contact_name: f.contactName,
    contact_phone: f.contactPhone,
  }
}

async function currentUserId(): Promise<string | null> {
  try {
    const { supabase } = await import('@/lib/supabase')
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  } catch {
    return null // anonymous reports are allowed
  }
}

const STEPS = [
  { key: 'location', short: 'Location', title: 'Where is help needed?' },
  { key: 'situation', short: 'Situation', title: 'What is happening?' },
  { key: 'people', short: 'People', title: 'Who needs help?' },
  { key: 'medical', short: 'Medical', title: 'Any medical needs?' },
  { key: 'review', short: 'Review', title: 'Check and send' },
] as const

const DRAFT_KEY = 'vyra.reportDraft.v1'

type Draft = { v: 1; form: FormState; step: number; clientId: string; savedAt: number }

const readDraft = (): Draft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    const d = raw ? (JSON.parse(raw) as Draft) : null
    return d && d.v === 1 && d.form ? d : null
  } catch {
    return null
  }
}
const writeDraft = (d: Draft | null) => {
  try {
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d))
    else localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* storage unavailable (private mode, quota): the form still works, it just cannot keep a draft */
  }
}
const isBlank = (f: FormState) => JSON.stringify(f) === JSON.stringify(EMPTY)

function Review({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <section className="clay-inset p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <button type="button" onClick={onEdit} className="btn-ghost btn-sm">
          <Icon name="edit" size={15} /> Edit<span className="sr-only"> {title}</span>
        </button>
      </div>
      <div className="mt-2 space-y-1 text-[15px]">{children}</div>
    </section>
  )
}
const Unknown = ({ children = 'Not answered (counts as unknown, not safe)' }: { children?: React.ReactNode }) => <span className="font-semibold text-warning-700">{children}</span>

export default function ReportForm({ onSubmitted }: { onSubmitted: (r: PublicReport) => void }) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [step, setStep] = useState(0)
  const [reached, setReached] = useState(0) // furthest step opened, so the rail never lets people skip ahead
  const [clientId, setClientId] = useState(newClientId) // same id on every retry -> no duplicate reports
  const [submitting, setSubmitting] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [error, setError] = useState<{ message: string; details?: { path: string; message: string }[] } | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [restored, setRestored] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  const set = <K extends keyof FormState>(field: K) => (value: FormState[K]) => setForm((f) => ({ ...f, [field]: value }))
  const setText = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))
  const injured = form.injurySeverity && !['none', 'unknown'].includes(form.injurySeverity)
  const last = STEPS.length - 1

  // Restore an unsent draft kept on this device.
  useEffect(() => {
    const d = readDraft()
    if (d && !isBlank(d.form)) {
      setForm({ ...EMPTY, ...d.form })
      const s = Math.min(Math.max(d.step, 0), last)
      setStep(s)
      setReached(s)
      if (d.clientId) setClientId(d.clientId)
      setSavedAt(d.savedAt)
      setRestored(true)
    }
    setHydrated(true)
  }, [last])

  // Keep the draft up to date as people type (debounced). Nothing leaves the device.
  useEffect(() => {
    if (!hydrated) return
    if (isBlank(form)) return writeDraft(null)
    const t = setTimeout(() => {
      const at = Date.now()
      writeDraft({ v: 1, form, step, clientId, savedAt: at })
      setSavedAt(at)
    }, 500)
    return () => clearTimeout(t)
  }, [form, step, clientId, hydrated])

  // Move focus to the new step's heading so keyboard and screen-reader users land in the right place.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  const unanswered = useMemo(() => {
    const list: string[] = []
    if (!form.dangers.length) list.push('danger')
    if (!form.injurySeverity) list.push('injuries')
    if (!form.peopleCount) list.push('number of people')
    if (!form.canEvacuate) list.push('evacuation')
    return list
  }, [form])

  const goTo = (n: number) => {
    setStep(n)
    setReached((r) => Math.max(r, n))
  }
  const next = () => {
    if (step === 0 && !form.location) {
      setLocationError('Add your location to continue. Use your current location or tap the map.')
      return
    }
    setLocationError('')
    goTo(Math.min(step + 1, last))
  }
  const startOver = () => {
    writeDraft(null)
    setForm(EMPTY)
    setClientId(newClientId())
    setStep(0)
    setReached(0)
    setRestored(false)
    setSavedAt(null)
    setError(null)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step < last) return next()
    if (!form.location) {
      setError({ message: 'Add your location before sending. Go back to step 1 and use your current location or tap the map.' })
      goTo(0)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const { report } = await api.createReport(toPayload(form, clientId, await currentUserId()))
      writeDraft(null)
      onSubmitted(report)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? { message: err.message, details: err.details }
          : { message: 'Could not send the report. Check your connection and press Send again. Your answers are kept on this device.' }
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  const current = STEPS[step]

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-10">
      {/* Step rail (desktop) with the safety note */}
      <aside className="hidden lg:block">
        <div className="sticky top-28 space-y-5">
          <nav aria-label="Report steps">
            <ol className="space-y-1">
              {STEPS.map((s, i) => {
                const done = i < step || (i <= reached && i !== step && i < step)
                const canOpen = i <= reached
                return (
                  <li key={s.key}>
                    <button
                      type="button"
                      disabled={!canOpen}
                      onClick={() => goTo(i)}
                      aria-current={i === step ? 'step' : undefined}
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left font-bold transition ${
                        i === step ? 'clay-sm' : canOpen ? 'hover:bg-sand-200/70' : 'opacity-60'
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                          done ? 'bg-success-700 text-white' : i === step ? 'bg-ink-900 text-white' : 'bg-sand-200 text-ink-700'
                        }`}
                      >
                        {done ? <Icon name="check" size={16} /> : i + 1}
                      </span>
                      <span>
                        {s.short}
                        {done && <span className="sr-only"> (done)</span>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </nav>
          <div className="clay-inset space-y-3 p-4 text-sm text-ink-800">
            <p className="flex items-start gap-2 font-bold"><Icon name="phone" size={18} className="mt-0.5 shrink-0" /> If a life is in danger and phones work, also call Rescue 1122.</p>
            <p>Responders review reports in order of urgency. You will get a reference number to check your status.</p>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Progress (mobile) */}
        <div className="mb-4 lg:hidden">
          <p className="flex items-center justify-between text-sm font-bold">
            <span>Step {step + 1} of {STEPS.length}</span>
            <span className="text-ink-600">{current.short}</span>
          </p>
          <div className="clay-inset mt-2 h-3 overflow-hidden" style={{ borderRadius: 999 }} role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-label="Report progress">
            <div className="status-fill h-full rounded-full bg-primary-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>

        {restored && (
          <div className="clay-sm mb-4 flex flex-wrap items-center justify-between gap-3 p-4" role="status">
            <p className="flex items-center gap-2 text-[15px] font-semibold"><Icon name="save" size={18} /> We restored a draft saved on this device.</p>
            <button type="button" onClick={startOver} className="btn-ghost btn-sm">Start over</button>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-2xl border-2 border-critical-700 bg-critical-100 p-4 text-ink-900" role="alert">
            <p className="flex items-start gap-2 font-bold"><Icon name="alert" size={18} className="mt-0.5 shrink-0" /> {error.message}</p>
            {!!error.details?.length && (
              <ul className="mt-1 list-disc pl-9 text-sm">
                {error.details.map((d) => (
                  <li key={d.path + d.message}>{d.path}: {d.message}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="clay p-5 sm:p-8">
          <h2 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold outline-none sm:text-4xl">{current.title}</h2>

          {step === 0 && (
            <div className="mt-2 space-y-5">
              <p className="hint">This is the only required answer. GPS is most accurate, or mark the spot on the map.</p>
              <div aria-describedby={locationError ? 'location-error' : undefined}>
                <LocationPicker value={form.location} onChange={(v) => { set('location')(v); setLocationError('') }} />
              </div>
              {locationError && (
                <p id="location-error" className="field-error" role="alert"><Icon name="alert" size={16} className="mt-0.5 shrink-0" /> {locationError}</p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="locationAddress">Landmark or address (optional)</label>
                  <input id="locationAddress" className="input" maxLength={300} value={form.locationAddress} onChange={setText('locationAddress')} placeholder="e.g. behind the market, blue gate" />
                </div>
                <div>
                  <label className="label" htmlFor="area">Area (optional)</label>
                  <select id="area" className="input" value={form.area} onChange={setText('area')}>
                    <option value="">Detect from location</option>
                    {AREAS.map((a) => (
                      <option key={a.name} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="mt-4 space-y-5">
              <ChoiceGroup multiple legend="What kind of danger is there?" hint="Choose everything that applies." options={DANGERS} value={form.dangers} onChange={set('dangers')} exclusive={['none']} />
              <div>
                <label className="label" htmlFor="dangerDetails">Describe the situation (optional)</label>
                <textarea id="dangerDetails" rows={3} maxLength={1000} className="input" value={form.dangerDetails} onChange={setText('dangerDetails')} placeholder="e.g. water is rising, family is on the roof" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="mt-4 space-y-7">
              <div>
                <label className="label" htmlFor="peopleCount">How many people need help?</label>
                <div className="flex flex-wrap items-center gap-3">
                  <input id="peopleCount" type="number" min={1} max={10000} inputMode="numeric" className="input w-36" value={form.peopleCount} onChange={setText('peopleCount')} placeholder="Number" />
                  <span className="hint">Leave empty if you are not sure.</span>
                </div>
              </div>
              <ChoiceGroup legend="Are there injuries?" options={INJURY_SEVERITIES} value={form.injurySeverity} onChange={set('injurySeverity')} />
              {injured && (
                <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
                  <div>
                    <label className="label" htmlFor="injuryCount">How many injured?</label>
                    <input id="injuryCount" type="number" min={1} inputMode="numeric" className="input" value={form.injuryCount} onChange={setText('injuryCount')} />
                  </div>
                  <div>
                    <label className="label" htmlFor="injuryDetails">Injury details</label>
                    <input id="injuryDetails" className="input" maxLength={1000} value={form.injuryDetails} onChange={setText('injuryDetails')} placeholder="e.g. broken leg, heavy bleeding" />
                  </div>
                </div>
              )}
              <ChoiceGroup columns={3} legend="Can everyone leave safely on their own?" options={EVACUATION_ABILITY} value={form.canEvacuate} onChange={set('canEvacuate')} />
              <ChoiceGroup multiple legend="Is anyone there who may need extra help?" options={VULNERABILITIES} value={form.vulnerabilities} onChange={set('vulnerabilities')} />
            </div>
          )}

          {step === 3 && (
            <div className="mt-4 space-y-5">
              <ChoiceGroup multiple legend="Essential medication, equipment or conditions" hint="Responders can plan for these. Skip this step if there are none." options={MEDICAL_NEEDS} value={form.medicalNeedTypes} onChange={set('medicalNeedTypes')} />
              <div>
                <label className="label" htmlFor="medicalNeeds">Details (optional)</label>
                <input id="medicalNeeds" className="input" maxLength={1000} value={form.medicalNeeds} onChange={setText('medicalNeeds')} placeholder="e.g. insulin runs out tonight" />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="mt-4 space-y-6">
              <fieldset>
                <legend className="label">Contact details (optional)</legend>
                <p className="hint mb-3">Only responders see these, so they can call you back.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="contactName">Name</label>
                    <input id="contactName" className="input" maxLength={120} autoComplete="name" value={form.contactName} onChange={setText('contactName')} />
                  </div>
                  <div>
                    <label className="label" htmlFor="contactPhone">Phone</label>
                    <input id="contactPhone" type="tel" className="input" maxLength={40} autoComplete="tel" value={form.contactPhone} onChange={setText('contactPhone')} placeholder="+92 ..." />
                  </div>
                </div>
              </fieldset>

              <div className="space-y-3">
                <h3 className="font-display text-xl font-semibold">Your answers</h3>
                <Review title="Location" onEdit={() => goTo(0)}>
                  {form.location ? (
                    <p>{form.location.source === 'gps' ? 'From GPS' : 'Selected on the map'}: {form.location.lat.toFixed(5)}, {form.location.lng.toFixed(5)}</p>
                  ) : (
                    <p className="font-semibold text-critical-700">Missing. Add a location before sending.</p>
                  )}
                  {form.locationAddress && <p>{form.locationAddress}</p>}
                  {form.area && <p>Area: {form.area}</p>}
                </Review>
                <Review title="Situation" onEdit={() => goTo(1)}>
                  <p>{form.dangers.length ? labelList(form.dangers, DANGERS) : <Unknown />}</p>
                  {form.dangerDetails && <p>{form.dangerDetails}</p>}
                </Review>
                <Review title="People" onEdit={() => goTo(2)}>
                  <p>People needing help: {form.peopleCount || <Unknown>Not sure</Unknown>}</p>
                  <p>Injuries: {form.injurySeverity ? INJURY_SEVERITIES[form.injurySeverity as keyof typeof INJURY_SEVERITIES] ?? form.injurySeverity : <Unknown />}</p>
                  <p>Can leave on their own: {form.canEvacuate ? EVACUATION_ABILITY[form.canEvacuate as keyof typeof EVACUATION_ABILITY] ?? form.canEvacuate : <Unknown />}</p>
                  {!!form.vulnerabilities.length && <p>Extra help: {labelList(form.vulnerabilities, VULNERABILITIES)}</p>}
                </Review>
                <Review title="Medical needs" onEdit={() => goTo(3)}>
                  <p>{form.medicalNeedTypes.length ? labelList(form.medicalNeedTypes, MEDICAL_NEEDS) : 'None listed'}</p>
                  {form.medicalNeeds && <p>{form.medicalNeeds}</p>}
                </Review>
              </div>

              {unanswered.length > 0 && form.location && (
                <p className="flex items-start gap-2 rounded-2xl bg-warning-100 p-3.5 text-sm font-semibold text-ink-900" role="note">
                  <Icon name="info" size={18} className="mt-0.5 shrink-0" />
                  Not answered: {unanswered.join(', ')}. You can still send. Responders will treat these as unknown, not as safe.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions: sticky on phones so the next step is always in reach */}
        <div className="sticky bottom-0 z-10 -mx-4 mt-5 bg-gradient-to-t from-sand-100 via-sand-100/95 to-transparent px-4 pb-4 pt-6 sm:static sm:mx-0 sm:bg-none sm:p-0">
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button type="button" className="btn-ghost" onClick={() => goTo(step - 1)}>
                <Icon name="arrow" size={18} className="rotate-180" /> Back
              </button>
            )}
            {step < last ? (
              <button type="submit" className="btn-primary ml-auto px-7">
                {step === 3 && !form.medicalNeedTypes.length && !form.medicalNeeds ? 'Skip' : 'Next'} <Icon name="arrow" size={18} />
              </button>
            ) : (
              <button type="submit" className="btn-primary cta-ring ml-auto flex-1 px-7 py-4 text-lg sm:flex-none" disabled={submitting}>
                <Icon name="alert" size={20} />
                {submitting ? 'Sending...' : 'Send emergency report'}
              </button>
            )}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-600" aria-live="polite">
            <Icon name="save" size={15} />
            {savedAt
              ? `Draft saved on this device at ${new Date(savedAt).toLocaleTimeString([], { timeStyle: 'short' })}. Nothing is sent until you press Send, and sending needs a connection.`
              : 'Your answers are kept on this device as you type. Nothing is sent until you press Send.'}
          </p>
        </div>
      </div>
    </form>
  )
}
