'use client'

// Stage 5 - Live Disaster Map. Loaded with next/dynamic (ssr: false).
import { useEffect } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { reportIcon, shelterIcon, teamIcon } from './markers'
import { PRIORITY_LABELS } from '@/lib/constants'
import { priorityRank, shortId } from '@/lib/client'
import type { BlockedRoad, RescueTeam, Shelter, TriagedReport } from '@/lib/types'

export type MapFocus = { center?: [number, number]; zoom?: number; fit?: boolean; at: number } | null
export type LayerToggles = { reports: boolean; shelters: boolean; teams: boolean; roadBlocks: boolean }

function FocusController({ focus, reports }: { focus: MapFocus; reports: TriagedReport[] }) {
  const map = useMap()
  useEffect(() => {
    if (focus?.center) map.flyTo(focus.center, focus.zoom || 13, { duration: 0.7 })
    else if (focus?.fit && reports.length) {
      map.fitBounds(L.latLngBounds(reports.map((r) => [r.location_lat, r.location_lng] as [number, number])).pad(0.2), { maxZoom: 15 })
    }
  }, [focus]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

// Clicking empty map clears the selected case.
function ClearOnMapClick({ onClear }: { onClear: () => void }) {
  useMapEvents({ click: onClear })
  return null
}

export default function DisasterMap({
  center,
  reports,
  layers,
  show,
  focus,
  selectedId = null,
  onSelect,
}: {
  center: [number, number]
  reports: TriagedReport[]
  layers: { shelters: Shelter[]; teams: RescueTeam[]; roadBlocks: BlockedRoad[] }
  show: LayerToggles
  focus: MapFocus
  selectedId?: string | null
  onSelect?: (report: TriagedReport | null) => void
}) {
  // Draw low priority first so urgent markers sit on top.
  const ordered = [...reports].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))

  return (
    <MapContainer center={center} zoom={11} className="h-full w-full">
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FocusController focus={focus} reports={reports} />
      <ClearOnMapClick onClear={() => onSelect?.(null)} />

      {show.roadBlocks &&
        layers.roadBlocks.map((b) => (
          <Polyline key={b.id} positions={b.path} pathOptions={{ color: '#182B3A', weight: 7, dashArray: '8 8', opacity: 0.85 }}>
            <Tooltip sticky>
              <strong>Blocked road</strong> - {b.description} ({b.reason})
            </Tooltip>
          </Polyline>
        ))}

      {show.shelters &&
        layers.shelters.map((s) => (
          <Marker key={s.id} position={[s.location_lat, s.location_lng]} icon={shelterIcon(s.status)}>
            <Popup>
              <div className="space-y-1 text-sm text-ink-900">
                <p className="font-semibold">{s.name}</p>
                <p>Status: <strong>{s.status}</strong></p>
                {!!s.capacity && <p>Occupancy: {s.current_occupancy ?? 0} / {s.capacity}</p>}
                {!!s.services?.length && <p>Services: {s.services.join(', ')}</p>}
                <p className="text-xs font-semibold text-success-700">Verified shelter</p>
              </div>
            </Popup>
          </Marker>
        ))}

      {show.teams &&
        layers.teams.map((t) => (
          <Marker key={t.id} position={[t.current_location_lat, t.current_location_lng]} icon={teamIcon(t.team_type, t.status)}>
            <Popup>
              <div className="space-y-1 text-sm text-ink-900">
                <p className="font-semibold">{t.team_name}</p>
                {t.team_type && <p>Type: {t.team_type.replace('_', ' ')}</p>}
                {!!t.capabilities?.length && <p>Capabilities: {t.capabilities.join(', ')}</p>}
                <p>Status: <strong>{t.status}</strong></p>
              </div>
            </Popup>
          </Marker>
        ))}

      {show.reports &&
        ordered.map((r) => (
          <Marker
            key={r.id}
            position={[r.location_lat, r.location_lng]}
            icon={reportIcon(r.priority, { verified: r.verified, overridden: r.overridden, selected: r.id === selectedId })}
            zIndexOffset={r.id === selectedId ? 10000 : priorityRank(r.priority) * 100}
            title={`${PRIORITY_LABELS[r.priority]} urgency case ${shortId(r.id)} in ${r.area}. Press Enter for details.`}
            eventHandlers={{ click: () => onSelect?.(r) }}
          />
        ))}
    </MapContainer>
  )
}
