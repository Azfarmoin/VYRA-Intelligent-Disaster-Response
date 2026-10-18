'use client'

// Humanitarian inventory: supplies on shelves with real stock, plus teams, shelters and route hazards.
import { useState, useEffect } from 'react'
import Link from 'next/link'
import SiteHeader from '@/components/common/SiteHeader'
import Icon, { type IconName } from '@/components/ui/Icon'
import { EmptyCrate } from '@/components/ui/Illustrations'
import { Dialog, Field, StatusPill, StockBar } from '@/components/resources/parts'
import { RESOURCE_TYPES, TEAM_CAPABILITIES, capabilityLabel, resourceTypeLabel } from '@/lib/matching'

interface Team {
  id: string
  team_name: string
  team_leader: string
  contact_number: string
  capabilities: string[] | null
  current_location_lat: number | null
  current_location_lng: number | null
  base_location: string | null
  team_size: number | null
  status: string
}

interface Resource {
  id: string
  resource_type: string
  name: string | null
  quantity: number
  team_id: string | null
  status: string
  rescue_teams?: { team_name: string } | null
}

interface Shelter {
  id: string
  name: string
  address: string
  capacity: number
  current_occupancy: number
  contact_number: string
  status: string
}

interface Hazard {
  id: string
  description: string
  location_lat: number
  location_lng: number
  radius_km: number
  severity: string
  active: boolean
}

type Tab = 'resources' | 'teams' | 'shelters' | 'hazards'

const TABS: { id: Tab; label: string; addLabel: string; icon: IconName }[] = [
  { id: 'resources', label: 'Supplies', addLabel: 'Add supplies', icon: 'box' },
  { id: 'teams', label: 'Rescue teams', addLabel: 'Register a team', icon: 'users' },
  { id: 'shelters', label: 'Shelters', addLabel: 'Add a shelter', icon: 'home' },
  { id: 'hazards', label: 'Route hazards', addLabel: 'Report a hazard', icon: 'road' },
]

const TYPE_ICON: Record<string, IconName> = { boat: 'boat', vehicle: 'truck', first_aid: 'heart', medical_supplies: 'pulse', food: 'box', water: 'droplet' }

const emptyForms = {
  team: {
    team_name: '',
    team_leader: '',
    contact_number: '',
    base_location: '',
    team_size: 4,
    capabilities: [] as string[],
    current_location_lat: '',
    current_location_lng: '',
  },
  resource: { resource_type: 'boat', name: '', quantity: 1, team_id: '' },
  hazard: { description: '', location_lat: '', location_lng: '', radius_km: 1, severity: 'high' },
  shelter: { name: '', address: '', capacity: 100, contact_number: '', location_lat: '', location_lng: '' },
}

const numOrNull = (v: string) => (v === '' ? null : Number(v))

export default function ResourcesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('resources')
  const [showAddModal, setShowAddModal] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [shelters, setShelters] = useState<Shelter[]>([])
  const [hazards, setHazards] = useState<Hazard[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pageError, setPageError] = useState('')
  const [teamForm, setTeamForm] = useState(emptyForms.team)
  const [resourceForm, setResourceForm] = useState(emptyForms.resource)
  const [hazardForm, setHazardForm] = useState(emptyForms.hazard)
  const [shelterForm, setShelterForm] = useState(emptyForms.shelter)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [restock, setRestock] = useState<{ type: string; itemId: string; amount: number } | null>(null)
  const [allocate, setAllocate] = useState<{ item: Resource; teamId: string } | null>(null)

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'teams') {
        const response = await fetch('/api/teams')
        if (response.ok) setTeams(await response.json())
      } else if (activeTab === 'resources') {
        const [resourcesRes, teamsRes] = await Promise.all([fetch('/api/resources'), fetch('/api/teams')])
        if (resourcesRes.ok) setResources(await resourcesRes.json())
        if (teamsRes.ok) setTeams(await teamsRes.json())
      } else if (activeTab === 'hazards') {
        const response = await fetch('/api/hazards')
        if (response.ok) setHazards(await response.json())
      } else if (activeTab === 'shelters') {
        const response = await fetch('/api/shelters')
        if (response.ok) setShelters(await response.json())
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      setPageError('Could not load this list. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const request = async (url: string, method: string, body?: unknown) => {
    setError('')
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || `Request failed (${response.status})`)
    }
    return response.json()
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (activeTab === 'teams') {
        await request('/api/teams', 'POST', {
          ...teamForm,
          current_location_lat: numOrNull(teamForm.current_location_lat),
          current_location_lng: numOrNull(teamForm.current_location_lng),
        })
        setTeamForm(emptyForms.team)
      } else if (activeTab === 'resources') {
        await request('/api/resources', 'POST', { ...resourceForm, team_id: resourceForm.team_id || null })
        setResourceForm(emptyForms.resource)
      } else if (activeTab === 'hazards') {
        await request('/api/hazards', 'POST', {
          ...hazardForm,
          location_lat: numOrNull(hazardForm.location_lat),
          location_lng: numOrNull(hazardForm.location_lng),
        })
        setHazardForm(emptyForms.hazard)
      } else {
        await request('/api/shelters', 'POST', {
          ...shelterForm,
          location_lat: numOrNull(shelterForm.location_lat),
          location_lng: numOrNull(shelterForm.location_lng),
        })
        setShelterForm(emptyForms.shelter)
      }
      setShowAddModal(false)
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const runAction = async (fn: () => Promise<unknown>) => {
    setPageError('')
    try {
      await fn()
      await fetchData()
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'That action failed. Try again.')
    }
  }

  const fillMyLocation = (apply: (lat: string, lng: string) => void) => {
    if (!navigator.geolocation) return setError('Geolocation is not supported by your browser.')
    navigator.geolocation.getCurrentPosition(
      (pos) => apply(pos.coords.latitude.toFixed(6), pos.coords.longitude.toFixed(6)),
      () => setError('Unable to get your location. Please enter it manually.')
    )
  }

  const openAdd = (preset?: Partial<typeof emptyForms.resource>) => {
    setError('')
    if (preset) setResourceForm({ ...emptyForms.resource, ...preset })
    setShowAddModal(true)
  }

  // Stock per type, derived only from the rows on the page.
  const stock = RESOURCE_TYPES.map((type) => {
    const items = resources.filter((r) => r.resource_type === type.value)
    const sum = (list: Resource[]) => list.reduce((s, r) => s + (r.quantity || 0), 0)
    const available = sum(items.filter((r) => r.status === 'available'))
    const inUse = sum(items.filter((r) => r.status === 'in_use'))
    const total = sum(items)
    return { ...type, items, available, inUse, other: total - available - inUse, total }
  })
  const attention = stock.filter((s) => s.items.length > 0 && (s.available === 0 || s.available / s.total <= 0.25))
  const untracked = stock.filter((s) => s.items.length === 0)

  const matchesFilter = (r: Resource) =>
    (!statusFilter || r.status === statusFilter) &&
    (!query.trim() || `${r.name ?? ''} ${resourceTypeLabel(r.resource_type)}`.toLowerCase().includes(query.trim().toLowerCase()))

  const activeTabMeta = TABS.find((t) => t.id === activeTab)!
  const teamName = (id: string | null) => (id ? teams.find((t) => t.id === id)?.team_name ?? 'Unknown team' : 'Shared pool')

  const DeleteBtn = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} className="rounded-xl px-3 py-1.5 text-sm font-bold text-critical-700 underline decoration-2 underline-offset-4 hover:bg-critical-100">Delete</button>
  )

  return (
    <div className="page">
      <SiteHeader />
      <main id="main" className="container-x py-6 sm:py-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold sm:text-5xl">Supplies and teams</h1>
            <p className="mt-2 text-lg text-ink-700">What we have, who holds it, and what is running low. Every number here comes from the records.</p>
          </div>
          <button onClick={() => openAdd(activeTab === 'resources' ? undefined : undefined)} className="btn-primary">
            <Icon name="plus" size={18} /> {activeTabMeta.addLabel}
          </button>
        </header>

        <div className="clay-inset mt-6 flex gap-1 overflow-x-auto p-1" role="tablist" aria-label="Inventory sections" style={{ borderRadius: 22 }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls="tab-panel"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-bold ${activeTab === tab.id ? 'clay-sm' : 'text-ink-600 hover:text-ink-900'}`}
            >
              <Icon name={tab.icon} size={18} /> {tab.label}
            </button>
          ))}
        </div>

        {pageError && (
          <p className="field-error mt-4" role="alert"><Icon name="alert" size={16} className="mt-0.5 shrink-0" /> {pageError}</p>
        )}

        <div id="tab-panel" role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="mt-6">
          {loading ? (
            <p className="py-16 text-center font-semibold text-ink-600" role="status">Loading...</p>
          ) : (
            <>
              {/* ---------- Supplies ---------- */}
              {activeTab === 'resources' && (
                <div className="space-y-6">
                  <section className="clay p-5 sm:p-6" aria-labelledby="attention-title">
                    <h2 id="attention-title" className="text-2xl font-semibold">Needs attention</h2>
                    {attention.length === 0 ? (
                      <p className="mt-2 flex items-center gap-2 font-semibold text-success-800"><Icon name="check" size={18} /> Nothing is running low in the supplies we track.</p>
                    ) : (
                      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {attention.map((s) => (
                          <li key={s.value} className="flex items-start gap-3 rounded-2xl bg-warning-100 p-3.5">
                            <Icon name="alert" size={20} className="mt-0.5 shrink-0" />
                            <span>
                              <span className="block font-bold">{s.label}: {s.available === 0 ? 'none available' : `only ${s.available} of ${s.total} available`}</span>
                              <button onClick={() => setRestock({ type: s.value, itemId: s.items[0].id, amount: 1 })} className="mt-0.5 text-sm font-bold underline decoration-2 underline-offset-4">Restock {s.label.toLowerCase()}</button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {untracked.length > 0 && <p className="mt-3 text-sm text-ink-600">Not tracked yet: {untracked.map((s) => s.label).join(', ')}.</p>}
                  </section>

                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[220px] flex-1">
                      <label className="label" htmlFor="supply-search">Search supplies</label>
                      <div className="relative">
                        <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
                        <input id="supply-search" className="input !pl-11" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or type, like Boat #3" />
                      </div>
                    </div>
                    <div>
                      <label className="label" htmlFor="supply-status">Status</label>
                      <select id="supply-status" className="input !w-52" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="">All statuses</option>
                        <option value="available">Available</option>
                        <option value="in_use">In use</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </div>
                  </div>

                  {resources.length === 0 ? (
                    <div className="clay flex flex-col items-center gap-3 p-10 text-center">
                      <EmptyCrate className="w-40" />
                      <h2 className="text-2xl font-semibold">No supplies tracked yet</h2>
                      <p className="max-w-md text-ink-700">Add boats, vehicles, medical supplies, food or water so teams can be matched to the cases that need them.</p>
                      <button onClick={() => openAdd()} className="btn-primary mt-1"><Icon name="plus" size={18} /> Add supplies</button>
                    </div>
                  ) : (
                    stock.filter((s) => s.items.length > 0).map((s) => {
                      const rows = s.items.filter(matchesFilter)
                      if ((query || statusFilter) && rows.length === 0) return null
                      return (
                        <section key={s.value} className="clay p-5 sm:p-6" aria-labelledby={`shelf-${s.value}`}>
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <span className="clay-sm flex h-12 w-12 items-center justify-center" style={{ borderRadius: 16 }}><Icon name={TYPE_ICON[s.value] ?? 'box'} size={24} /></span>
                              <h2 id={`shelf-${s.value}`} className="text-2xl font-semibold">{s.label}</h2>
                            </div>
                            <button onClick={() => setRestock({ type: s.value, itemId: s.items[0].id, amount: 1 })} className="btn-ghost btn-sm">
                              <Icon name="plus" size={16} /> Restock
                            </button>
                          </div>
                          <div className="mt-4 max-w-xl"><StockBar available={s.available} inUse={s.inUse} other={s.other} total={s.total} /></div>

                          <ul className="mt-5 divide-y divide-sand-200">
                            {rows.map((r) => (
                              <li key={r.id} className="grid gap-x-4 gap-y-2 py-3.5 sm:grid-cols-[minmax(0,1.4fr)_auto_minmax(0,1fr)_auto] sm:items-center">
                                <div className="min-w-0">
                                  <p className="font-bold">{r.name || resourceTypeLabel(r.resource_type)}</p>
                                  <p className="text-sm text-ink-600">Quantity {r.quantity}</p>
                                </div>
                                <StatusPill status={r.status} />
                                <p className="text-[15px]"><span className="text-ink-600">Held by </span><span className="font-bold">{teamName(r.team_id)}</span></p>
                                <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                                  {r.status !== 'in_use' && (
                                    <button onClick={() => setAllocate({ item: r, teamId: r.team_id ?? '' })} className="btn-ghost btn-sm">Allocate</button>
                                  )}
                                  {r.status !== 'in_use' && (
                                    <button
                                      onClick={() => runAction(() => request(`/api/resources/${r.id}`, 'PATCH', { status: r.status === 'available' ? 'maintenance' : 'available' }))}
                                      className="btn-ghost btn-sm"
                                    >
                                      {r.status === 'available' ? 'Send to maintenance' : 'Mark available'}
                                    </button>
                                  )}
                                  {r.status !== 'in_use' && <DeleteBtn onClick={() => confirm('Delete this resource?') && runAction(() => request(`/api/resources/${r.id}`, 'DELETE'))} />}
                                </div>
                              </li>
                            ))}
                            {rows.length === 0 && <li className="py-4 text-sm text-ink-600">No items match your search.</li>}
                          </ul>
                        </section>
                      )
                    })
                  )}
                </div>
              )}

              {/* ---------- Teams ---------- */}
              {activeTab === 'teams' && (
                teams.length === 0 ? (
                  <div className="clay flex flex-col items-center gap-3 p-10 text-center">
                    <EmptyCrate className="w-40" />
                    <h2 className="text-2xl font-semibold">No teams registered yet</h2>
                    <p className="max-w-md text-ink-700">Register a rescue team so it can be suggested for cases.</p>
                    <button onClick={() => openAdd()} className="btn-primary mt-1"><Icon name="plus" size={18} /> Register a team</button>
                  </div>
                ) : (
                  <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {teams.map((team) => (
                      <li key={team.id} className="clay flex flex-col p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h2 className="text-2xl font-semibold leading-tight">{team.team_name}</h2>
                            <p className="text-sm text-ink-600">{team.team_size ?? '?'} members</p>
                          </div>
                          <StatusPill status={team.status} />
                        </div>
                        <p className="mt-3 text-[15px]">
                          <span className="font-bold">{team.team_leader || 'No leader listed'}</span>
                          {team.contact_number && <> · <a className="underline decoration-2 underline-offset-4" href={`tel:${team.contact_number}`}>{team.contact_number}</a></>}
                        </p>
                        <p className="mt-1 text-sm text-ink-700">
                          {team.base_location || 'No base listed'}
                          {team.current_location_lat != null && ` · ${Number(team.current_location_lat).toFixed(4)}, ${Number(team.current_location_lng).toFixed(4)}`}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {(team.capabilities ?? []).map((cap) => (
                            <span key={cap} className="rounded-lg bg-sand-200 px-2.5 py-1 text-xs font-bold text-ink-800">{capabilityLabel(cap)}</span>
                          ))}
                        </div>
                        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                          {team.status !== 'assigned' ? (
                            <button
                              onClick={() => runAction(() => request(`/api/teams/${team.id}`, 'PATCH', { status: team.status === 'available' ? 'unavailable' : 'available' }))}
                              className="btn-ghost btn-sm"
                            >
                              Mark {team.status === 'available' ? 'unavailable' : 'available'}
                            </button>
                          ) : (
                            <Link href="/dispatches" className="btn-ghost btn-sm">View mission</Link>
                          )}
                          {team.status !== 'assigned' && <DeleteBtn onClick={() => confirm(`Delete team ${team.team_name}?`) && runAction(() => request(`/api/teams/${team.id}`, 'DELETE'))} />}
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              )}

              {/* ---------- Shelters ---------- */}
              {activeTab === 'shelters' && (
                shelters.length === 0 ? (
                  <div className="clay flex flex-col items-center gap-3 p-10 text-center">
                    <EmptyCrate className="w-40" />
                    <h2 className="text-2xl font-semibold">No shelters added yet</h2>
                    <button onClick={() => openAdd()} className="btn-primary mt-1"><Icon name="plus" size={18} /> Add a shelter</button>
                  </div>
                ) : (
                  <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {shelters.map((s) => {
                      const pct = s.capacity ? Math.min(100, Math.round((s.current_occupancy / s.capacity) * 100)) : 0
                      return (
                        <li key={s.id} className="clay p-5">
                          <div className="flex items-start justify-between gap-3">
                            <h2 className="text-2xl font-semibold leading-tight">{s.name}</h2>
                            <StatusPill status={s.status} />
                          </div>
                          <p className="mt-1 text-[15px] text-ink-700">{s.address || 'No address listed'}</p>
                          <div className="mt-4">
                            <div className="h-3.5 overflow-hidden rounded-full bg-sand-200" role="img" aria-label={`${s.current_occupancy} of ${s.capacity} places taken`}>
                              <div className="status-fill h-full rounded-full bg-ink-800" style={{ width: `${pct}%` }} />
                            </div>
                            <p className="mt-1.5 text-sm font-semibold text-ink-700"><span className="text-ink-900">{s.current_occupancy} of {s.capacity}</span> places taken</p>
                          </div>
                          {s.contact_number && <p className="mt-3 text-sm">Contact <a className="font-bold underline decoration-2 underline-offset-4" href={`tel:${s.contact_number}`}>{s.contact_number}</a></p>}
                        </li>
                      )
                    })}
                  </ul>
                )
              )}

              {/* ---------- Hazards ---------- */}
              {activeTab === 'hazards' && (
                <div className="space-y-5">
                  <p className="max-w-2xl text-ink-700">Flooded roads, collapsed bridges and other hazards. Team suggestions penalise routes that cross active hazards.</p>
                  {hazards.length === 0 ? (
                    <div className="clay flex flex-col items-center gap-3 p-10 text-center">
                      <EmptyCrate className="w-40" />
                      <h2 className="text-2xl font-semibold">No route hazards reported</h2>
                      <button onClick={() => openAdd()} className="btn-primary mt-1"><Icon name="plus" size={18} /> Report a hazard</button>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {hazards.map((h) => (
                        <li key={h.id} className="clay-sm flex flex-wrap items-center gap-x-5 gap-y-2 p-4" style={{ borderRadius: 22 }}>
                          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${h.severity === 'high' ? 'bg-critical' : h.severity === 'medium' ? 'bg-ember' : 'bg-warning'}`}><Icon name="alert" size={22} /></span>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold">{h.description}</p>
                            <p className="text-sm text-ink-700">
                              {Number(h.location_lat).toFixed(4)}, {Number(h.location_lng).toFixed(4)} · {h.radius_km} km radius
                            </p>
                          </div>
                          <span className="pill bg-sand-200 text-ink-800">{h.severity} severity</span>
                          <span className={`pill ${h.active ? 'bg-critical-100 text-critical-700' : 'bg-success-100 text-success-800'}`}>{h.active ? 'active' : 'cleared'}</span>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => runAction(() => request(`/api/hazards/${h.id}`, 'PATCH', { active: !h.active }))} className="btn-ghost btn-sm">{h.active ? 'Mark cleared' : 'Reactivate'}</button>
                            <DeleteBtn onClick={() => runAction(() => request(`/api/hazards/${h.id}`, 'DELETE'))} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ---------- Restock ---------- */}
      {restock && (() => {
        const items = resources.filter((r) => r.resource_type === restock.type)
        const item = items.find((r) => r.id === restock.itemId) ?? items[0]
        const after = (item?.quantity ?? 0) + (restock.amount || 0)
        return (
          <Dialog title={`Restock ${resourceTypeLabel(restock.type).toLowerCase()}`} onClose={() => setRestock(null)}>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!item || !(restock.amount >= 1)) return
                runAction(() => request(`/api/resources/${item.id}`, 'PATCH', { quantity: after })).then(() => setRestock(null))
              }}
              className="space-y-4"
            >
              <Field label="Which item is being topped up?" htmlFor="restock-item">
                <select id="restock-item" className="input" value={item?.id} onChange={(e) => setRestock({ ...restock, itemId: e.target.value })}>
                  {items.map((r) => (
                    <option key={r.id} value={r.id}>{r.name || resourceTypeLabel(r.resource_type)} (now {r.quantity})</option>
                  ))}
                </select>
              </Field>
              <Field label="How many are you adding?" htmlFor="restock-amount">
                <input id="restock-amount" type="number" min={1} inputMode="numeric" className="input" value={restock.amount} onChange={(e) => setRestock({ ...restock, amount: parseInt(e.target.value) || 0 })} aria-invalid={!(restock.amount >= 1)} />
                {!(restock.amount >= 1) && <p className="field-error"><Icon name="alert" size={16} className="mt-0.5 shrink-0" /> Enter 1 or more.</p>}
              </Field>
              <p className="clay-inset flex items-center justify-between gap-3 p-4 font-bold" aria-live="polite">
                <span>Quantity</span>
                <span className="font-display text-2xl">{item?.quantity ?? 0} <Icon name="arrow" size={18} className="mx-1 inline" /> {after}</span>
              </p>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setRestock(null)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={!item || !(restock.amount >= 1)}>Confirm restock</button>
              </div>
            </form>
          </Dialog>
        )
      })()}

      {/* ---------- Allocate ---------- */}
      {allocate && (
        <Dialog title="Allocate to a team" onClose={() => setAllocate(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              runAction(() => request(`/api/resources/${allocate.item.id}`, 'PATCH', { team_id: allocate.teamId || null })).then(() => setAllocate(null))
            }}
            className="space-y-4"
          >
            <p className="text-[15px]"><span className="font-bold">{allocate.item.name || resourceTypeLabel(allocate.item.resource_type)}</span> · quantity {allocate.item.quantity}</p>
            <Field label="Hold these supplies with" htmlFor="alloc-team" hint="Shared pool means any team can use them.">
              <select id="alloc-team" className="input" value={allocate.teamId} onChange={(e) => setAllocate({ ...allocate, teamId: e.target.value })}>
                <option value="">Shared pool</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.team_name}</option>
                ))}
              </select>
            </Field>
            <p className="clay-inset flex flex-wrap items-center justify-between gap-2 p-4 font-bold" aria-live="polite">
              <span>Held by</span>
              <span>{teamName(allocate.item.team_id)} <Icon name="arrow" size={16} className="mx-1 inline" /> {teamName(allocate.teamId || null)}</span>
            </p>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setAllocate(null)} className="btn-ghost flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={(allocate.item.team_id ?? '') === allocate.teamId}>Confirm allocation</button>
            </div>
          </form>
        </Dialog>
      )}

      {/* ---------- Add ---------- */}
      {showAddModal && (
        <Dialog title={activeTabMeta.addLabel} onClose={() => setShowAddModal(false)} wide>
          <form onSubmit={handleAdd} className="space-y-4">
            {error && (
              <p className="flex items-start gap-2 rounded-2xl border-2 border-critical-700 bg-critical-100 p-3.5 text-[15px] font-bold" role="alert"><Icon name="alert" size={18} className="mt-0.5 shrink-0" /> {error}</p>
            )}

            {activeTab === 'teams' && (
              <>
                <Field label="Team name (required)" htmlFor="t-name">
                  <input id="t-name" required className="input" value={teamForm.team_name} onChange={(e) => setTeamForm({ ...teamForm, team_name: e.target.value })} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Team leader" htmlFor="t-leader"><input id="t-leader" className="input" value={teamForm.team_leader} onChange={(e) => setTeamForm({ ...teamForm, team_leader: e.target.value })} /></Field>
                  <Field label="Contact number" htmlFor="t-phone"><input id="t-phone" type="tel" className="input" value={teamForm.contact_number} onChange={(e) => setTeamForm({ ...teamForm, contact_number: e.target.value })} /></Field>
                  <Field label="Base or station" htmlFor="t-base"><input id="t-base" className="input" value={teamForm.base_location} onChange={(e) => setTeamForm({ ...teamForm, base_location: e.target.value })} /></Field>
                  <Field label="Members" htmlFor="t-size"><input id="t-size" type="number" min={1} className="input" value={teamForm.team_size} onChange={(e) => setTeamForm({ ...teamForm, team_size: parseInt(e.target.value) || 1 })} /></Field>
                </div>
                <fieldset>
                  <legend className="label">Capabilities</legend>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {TEAM_CAPABILITIES.map((cap) => (
                      <label key={cap.value} className="chip">
                        <input
                          type="checkbox"
                          checked={teamForm.capabilities.includes(cap.value)}
                          onChange={(e) =>
                            setTeamForm({
                              ...teamForm,
                              capabilities: e.target.checked ? [...teamForm.capabilities, cap.value] : teamForm.capabilities.filter((c) => c !== cap.value),
                            })
                          }
                        />
                        {cap.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="label">Current location, for distance matching</legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Latitude" htmlFor="t-lat"><input id="t-lat" type="number" step="any" className="input" value={teamForm.current_location_lat} onChange={(e) => setTeamForm({ ...teamForm, current_location_lat: e.target.value })} /></Field>
                    <Field label="Longitude" htmlFor="t-lng"><input id="t-lng" type="number" step="any" className="input" value={teamForm.current_location_lng} onChange={(e) => setTeamForm({ ...teamForm, current_location_lng: e.target.value })} /></Field>
                  </div>
                  <button type="button" className="btn-ghost btn-sm mt-3" onClick={() => fillMyLocation((lat, lng) => setTeamForm((f) => ({ ...f, current_location_lat: lat, current_location_lng: lng })))}>
                    <Icon name="pin" size={16} /> Use my location
                  </button>
                </fieldset>
              </>
            )}

            {activeTab === 'resources' && (
              <>
                <Field label="Type" htmlFor="r-type">
                  <select id="r-type" className="input" value={resourceForm.resource_type} onChange={(e) => setResourceForm({ ...resourceForm, resource_type: e.target.value })}>
                    {RESOURCE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Name or identifier" htmlFor="r-name" hint="For example Boat #3 or Ambulance A1.">
                  <input id="r-name" className="input" value={resourceForm.name} onChange={(e) => setResourceForm({ ...resourceForm, name: e.target.value })} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Quantity" htmlFor="r-qty"><input id="r-qty" type="number" min={1} className="input" value={resourceForm.quantity} onChange={(e) => setResourceForm({ ...resourceForm, quantity: parseInt(e.target.value) || 1 })} /></Field>
                  <Field label="Held by" htmlFor="r-team">
                    <select id="r-team" className="input" value={resourceForm.team_id} onChange={(e) => setResourceForm({ ...resourceForm, team_id: e.target.value })}>
                      <option value="">Shared pool (any team)</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.team_name}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </>
            )}

            {activeTab === 'hazards' && (
              <>
                <Field label="Description (required)" htmlFor="h-desc" hint="For example: flooded road on Main St.">
                  <input id="h-desc" required className="input" value={hazardForm.description} onChange={(e) => setHazardForm({ ...hazardForm, description: e.target.value })} />
                </Field>
                <fieldset>
                  <legend className="label">Location (required)</legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Latitude" htmlFor="h-lat"><input id="h-lat" required type="number" step="any" className="input" value={hazardForm.location_lat} onChange={(e) => setHazardForm({ ...hazardForm, location_lat: e.target.value })} /></Field>
                    <Field label="Longitude" htmlFor="h-lng"><input id="h-lng" required type="number" step="any" className="input" value={hazardForm.location_lng} onChange={(e) => setHazardForm({ ...hazardForm, location_lng: e.target.value })} /></Field>
                  </div>
                  <button type="button" className="btn-ghost btn-sm mt-3" onClick={() => fillMyLocation((lat, lng) => setHazardForm((f) => ({ ...f, location_lat: lat, location_lng: lng })))}>
                    <Icon name="pin" size={16} /> Use my location
                  </button>
                </fieldset>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Radius (km)" htmlFor="h-rad"><input id="h-rad" type="number" step="0.1" min={0.1} className="input" value={hazardForm.radius_km} onChange={(e) => setHazardForm({ ...hazardForm, radius_km: parseFloat(e.target.value) || 1 })} /></Field>
                  <Field label="Severity" htmlFor="h-sev">
                    <select id="h-sev" className="input" value={hazardForm.severity} onChange={(e) => setHazardForm({ ...hazardForm, severity: e.target.value })}>
                      <option value="high">High: impassable</option>
                      <option value="medium">Medium: risky</option>
                      <option value="low">Low: slow</option>
                    </select>
                  </Field>
                </div>
              </>
            )}

            {activeTab === 'shelters' && (
              <>
                <Field label="Shelter name (required)" htmlFor="s-name"><input id="s-name" required className="input" value={shelterForm.name} onChange={(e) => setShelterForm({ ...shelterForm, name: e.target.value })} /></Field>
                <Field label="Address" htmlFor="s-addr"><input id="s-addr" className="input" value={shelterForm.address} onChange={(e) => setShelterForm({ ...shelterForm, address: e.target.value })} /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Capacity" htmlFor="s-cap"><input id="s-cap" type="number" min={1} className="input" value={shelterForm.capacity} onChange={(e) => setShelterForm({ ...shelterForm, capacity: parseInt(e.target.value) || 0 })} /></Field>
                  <Field label="Contact number" htmlFor="s-phone"><input id="s-phone" type="tel" className="input" value={shelterForm.contact_number} onChange={(e) => setShelterForm({ ...shelterForm, contact_number: e.target.value })} /></Field>
                  <Field label="Latitude" htmlFor="s-lat"><input id="s-lat" type="number" step="any" className="input" value={shelterForm.location_lat} onChange={(e) => setShelterForm({ ...shelterForm, location_lat: e.target.value })} /></Field>
                  <Field label="Longitude" htmlFor="s-lng"><input id="s-lng" type="number" step="any" className="input" value={shelterForm.location_lng} onChange={(e) => setShelterForm({ ...shelterForm, location_lng: e.target.value })} /></Field>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-ghost flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  )
}
