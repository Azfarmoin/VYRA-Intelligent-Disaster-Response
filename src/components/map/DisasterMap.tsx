'use client'

// Stage 5 - Live Disaster Map. Loaded with next/dynamic (ssr: false).
import { useEffect } from 'react'
<<<<<<< HEAD
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { reportIcon, shelterIcon, teamIcon } from './markers'
import { PRIORITY_LABELS } from '@/lib/constants'
import { priorityRank, shortId } from '@/lib/client'
=======
import Link from 'next/link'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet'
import { reportIcon, shelterIcon, teamIcon } from './markers'
import { PriorityBadge, StatusBadge, VerifiedBadge } from '../common/Badges'
import { formatWait, priorityRank, shortId } from '@/lib/client'
>>>>>>> origin/main
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

<<<<<<< HEAD
// Clicking empty map clears the selected case.
function ClearOnMapClick({ onClear }: { onClear: () => void }) {
  useMapEvents({ click: onClear })
  return null
=======
function ReportPopup({ r }: { r: TriagedReport }) {
  return (
    <div className="w-64 space-y-2 text-sm text-gray-900">
      <div className="flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={r.priority} small />
        <StatusBadge status={r.status} />
        <VerifiedBadge verified={r.verified} />
      </div>
      <p className="font-semibold">
        #{shortId(r.id)} · {r.area}
        {r.overridden && <span className="ml-1 text-xs font-normal text-purple-700">(responder override)</span>}
      </p>
      {r.location_address && <p className="text-gray-600">{r.location_address}</p>}
      <p className="text-gray-600">
        {r.people_count ? `${r.people_count} ${r.people_count === 1 ? 'person' : 'people'}` : 'People: unknown'} · waiting {formatWait(r.triage.waitingMinutes)}
      </p>
      <ul className="space-y-0.5 border-t pt-2">
        {r.triage.factors.slice(0, 3).map((f) => (
          <li key={f.key} className="flex justify-between gap-2">
            <span>{f.category}</span>
            <span className="font-mono text-gray-500">+{f.points}</span>
          </li>
        ))}
      </ul>
      <Link href={`/dashboard?id=${r.id}`} className="block rounded-md bg-primary-600 px-2 py-1.5 text-center text-xs font-semibold !text-white">
        Open case & full explanation
      </Link>
    </div>
  )
>>>>>>> origin/main
}

export default function DisasterMap({
  center,
  reports,
  layers,
  show,
  focus,
<<<<<<< HEAD
  selectedId = null,
  onSelect,
=======
>>>>>>> origin/main
}: {
  center: [number, number]
  reports: TriagedReport[]
  layers: { shelters: Shelter[]; teams: RescueTeam[]; roadBlocks: BlockedRoad[] }
  show: LayerToggles
  focus: MapFocus
<<<<<<< HEAD
  selectedId?: string | null
  onSelect?: (report: TriagedReport | null) => void
=======
>>>>>>> origin/main
}) {
  // Draw low priority first so urgent markers sit on top.
  const ordered = [...reports].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))

  return (
    <MapContainer center={center} zoom={11} className="h-full w-full">
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FocusController focus={focus} reports={reports} />
<<<<<<< HEAD
      <ClearOnMapClick onClear={() => onSelect?.(null)} />

      {show.roadBlocks &&
        layers.roadBlocks.map((b) => (
          <Polyline key={b.id} positions={b.path} pathOptions={{ color: '#182B3A', weight: 7, dashArray: '8 8', opacity: 0.85 }}>
=======

      {show.roadBlocks &&
        layers.roadBlocks.map((b) => (
          <Polyline key={b.id} positions={b.path} pathOptions={{ color: '#111827', weight: 7, dashArray: '8 8', opacity: 0.85 }}>
>>>>>>> origin/main
            <Tooltip sticky>
              <strong>Blocked road</strong> - {b.description} ({b.reason})
            </Tooltip>
          </Polyline>
        ))}

      {show.shelters &&
        layers.shelters.map((s) => (
          <Marker key={s.id} position={[s.location_lat, s.location_lng]} icon={shelterIcon(s.status)}>
            <Popup>
<<<<<<< HEAD
              <div className="space-y-1 text-sm text-ink-900">
=======
              <div className="space-y-1 text-sm text-gray-900">
>>>>>>> origin/main
                <p className="font-semibold">{s.name}</p>
                <p>Status: <strong>{s.status}</strong></p>
                {!!s.capacity && <p>Occupancy: {s.current_occupancy ?? 0} / {s.capacity}</p>}
                {!!s.services?.length && <p>Services: {s.services.join(', ')}</p>}
<<<<<<< HEAD
                <p className="text-xs font-semibold text-success-700">Verified shelter</p>
=======
                <p className="text-xs text-green-700">Verified shelter</p>
>>>>>>> origin/main
              </div>
            </Popup>
          </Marker>
        ))}

      {show.teams &&
        layers.teams.map((t) => (
          <Marker key={t.id} position={[t.current_location_lat, t.current_location_lng]} icon={teamIcon(t.team_type, t.status)}>
            <Popup>
<<<<<<< HEAD
              <div className="space-y-1 text-sm text-ink-900">
=======
              <div className="space-y-1 text-sm text-gray-900">
>>>>>>> origin/main
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
<<<<<<< HEAD
            icon={reportIcon(r.priority, { verified: r.verified, overridden: r.overridden, selected: r.id === selectedId })}
            zIndexOffset={r.id === selectedId ? 10000 : priorityRank(r.priority) * 100}
            title={`${PRIORITY_LABELS[r.priority]} urgency case ${shortId(r.id)} in ${r.area}. Press Enter for details.`}
            eventHandlers={{ click: () => onSelect?.(r) }}
          />
=======
            icon={reportIcon(r.priority, { verified: r.verified, overridden: r.overridden })}
            zIndexOffset={priorityRank(r.priority) * 100}
          >
            <Popup>
              <ReportPopup r={r} />
            </Popup>
          </Marker>
>>>>>>> origin/main
        ))}
    </MapContainer>
  )
}
