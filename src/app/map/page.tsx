'use client'

// Stage 5 - Live disaster map: the map is the page. Filters float in a dock, a case opens in a sheet.
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import SiteHeader from '@/components/common/SiteHeader'
import { DemoModeBanner, UpdatedDot } from '@/components/common/Badges'
import Icon from '@/components/ui/Icon'
import MapFilters, { type MapFilterState } from '@/components/map/MapFilters'
import IncidentSheet from '@/components/map/IncidentSheet'
import type { LayerToggles, MapFocus } from '@/components/map/DisasterMap'
import { AREAS, DEFAULT_CENTER, PRIORITIES } from '@/lib/constants'
import { api, usePolledReports } from '@/lib/client'
import type { BlockedRoad, RescueTeam, Shelter } from '@/lib/types'

const DisasterMap = dynamic(() => import('@/components/map/DisasterMap'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-sand-200 font-semibold text-ink-600">Loading map...</div>,
})

export default function MapPage() {
  const [filters, setFilters] = useState<MapFilterState>({ area: '', status: 'open', priority: [...PRIORITIES], verified: '' })
  const [show, setShow] = useState<LayerToggles>({ reports: true, shelters: true, teams: true, roadBlocks: true })
  const [layers, setLayers] = useState<{ shelters: Shelter[]; teams: RescueTeam[]; roadBlocks: BlockedRoad[] }>({ shelters: [], teams: [], roadBlocks: [] })
  const [focus, setFocus] = useState<MapFocus>(null)
  const [dockOpen, setDockOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Open the dock by default on wide screens only.
  useEffect(() => setDockOpen(window.matchMedia('(min-width: 768px)').matches), [])

  const query = useMemo(
    () => ({
      area: filters.area,
      status: filters.status,
      verified: filters.verified,
      // all urgencies selected = no filter; none selected = show nothing
      priority: filters.priority.length === PRIORITIES.length ? '' : filters.priority.join(',') || 'none',
    }),
    [filters]
  )
  const { reports, summary, mode, error, lastUpdated } = usePolledReports(api.listReports, query)
  const selected = reports.find((r) => r.id === selectedId) ?? null

  useEffect(() => {
    const load = () => api.mapLayers(filters.area).then(setLayers).catch(() => {})
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [filters.area])

  useEffect(() => {
    const area = AREAS.find((a) => a.name === filters.area)
    setFocus(area ? { center: area.center, zoom: 13, at: Date.now() } : { center: DEFAULT_CENTER, zoom: 11, at: Date.now() })
  }, [filters.area])

  return (
    <div className="page flex h-screen flex-col">
      <SiteHeader />
      <DemoModeBanner mode={mode} />
      <main id="main" className="relative min-h-0 flex-1 p-3 pt-3 sm:px-5 sm:pb-5">
        <h1 className="sr-only">Live disaster map</h1>
        <div className="clay relative h-full overflow-hidden p-1.5" style={{ borderRadius: 32 }}>
          <div className="relative h-full overflow-hidden" style={{ borderRadius: 26 }}>
            <DisasterMap
              center={DEFAULT_CENTER}
              reports={reports}
              layers={layers}
              show={show}
              focus={focus}
              selectedId={selectedId}
              onSelect={(r) => setSelectedId(r?.id ?? null)}
            />

            {/* Status chip: always visible, even with the dock closed */}
            <div className="clay-sm absolute left-3 top-3 z-[999] flex items-center gap-3 px-3.5 py-2 text-sm" style={{ borderRadius: 16 }}>
              <span className="font-bold">
                {reports.length} {reports.length === 1 ? 'report' : 'reports'}
              </span>
              <UpdatedDot at={lastUpdated} error={error} />
              <button type="button" className="btn-ghost btn-sm -my-1 ml-1" aria-expanded={dockOpen} aria-controls="map-dock" onClick={() => setDockOpen((v) => !v)}>
                <Icon name="filter" size={16} />
                {dockOpen ? 'Hide filters' : 'Filters'}
              </button>
            </div>

            {dockOpen && (
              <aside
                id="map-dock"
                aria-label="Map filters"
                className="clay rise absolute inset-x-2 bottom-2 top-16 z-[1000] overflow-y-auto p-4 md:inset-x-auto md:bottom-3 md:left-3 md:top-[68px] md:w-[340px]"
                style={{ borderRadius: 24 }}
              >
                {error && <p className="mb-3 rounded-xl bg-critical-100 p-2.5 text-sm font-semibold text-critical-700" role="alert">{error.message}</p>}
                <MapFilters
                  filters={filters}
                  setFilters={setFilters}
                  show={show}
                  setShow={setShow}
                  summary={summary}
                  layerCounts={{ shelters: layers.shelters.length, teams: layers.teams.length, roadBlocks: layers.roadBlocks.length }}
                />
                <button className="btn-ghost mt-4 w-full" onClick={() => setFocus({ fit: true, at: Date.now() })} disabled={!reports.length}>
                  <Icon name="search" size={18} /> Zoom to shown reports
                </button>
              </aside>
            )}

            {selected && <IncidentSheet report={selected} onClose={() => setSelectedId(null)} />}
          </div>
        </div>
      </main>
    </div>
  )
}
