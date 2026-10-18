'use client'

// Loaded with next/dynamic (ssr: false) because Leaflet needs `window`.
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import { pickerIcon } from '../map/markers'
import { DEFAULT_CENTER } from '@/lib/constants'
import Icon from '@/components/ui/Icon'

export interface PickedLocation {
  lat: number
  lng: number
  source: 'gps' | 'manual'
  accuracyM?: number
}

function ClickToPlace({ onPick }: { onPick: (p: { lat: number; lng: number }) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng) })
  return null
}

function FlyTo({ position }: { position: PickedLocation | null }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 15), { duration: 0.6 })
  }, [position?.lat, position?.lng]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

// GPS on request; people can always tap the map or drag the pin instead.
export default function LocationPicker({ value, onChange }: { value: PickedLocation | null; onChange: (v: PickedLocation) => void }) {
  const [gps, setGps] = useState<{ state: 'idle' | 'loading' | 'ok' | 'error'; message: string }>({ state: 'idle', message: '' })

  const useGps = () => {
    if (!('geolocation' in navigator)) {
      setGps({ state: 'error', message: 'This device does not support GPS location. Please tap the map.' })
      return
    }
    setGps({ state: 'loading', message: 'Getting your location...' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const accuracyM = Math.round(pos.coords.accuracy)
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'gps', accuracyM })
        setGps({ state: 'ok', message: `Location found (accuracy about ${accuracyM} m). Drag the pin if it is not exact.` })
      },
      (err) =>
        setGps({
          state: 'error',
          message:
            err.code === err.PERMISSION_DENIED
              ? 'Location permission was denied. Please tap the map to mark where help is needed.'
              : 'Could not get a GPS fix. Please tap the map to mark where help is needed.',
        }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    )
  }

  const pickManual = (p: { lat: number; lng: number }) => onChange({ lat: p.lat, lng: p.lng, source: 'manual' })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={useGps} className="btn-primary" disabled={gps.state === 'loading'}>
          <Icon name="pin" size={18} />
          {gps.state === 'loading' ? 'Locating...' : 'Use my current location'}
        </button>
        <span className="hint">or tap the map, or drag the pin</span>
      </div>
      {gps.message && (
        <p className={`flex items-start gap-1.5 text-sm font-semibold ${gps.state === 'error' ? 'text-critical-700' : 'text-ink-700'}`} role="status">
          <Icon name={gps.state === 'error' ? 'alert' : 'info'} size={16} className="mt-0.5 shrink-0" />
          {gps.message}
        </p>
      )}
      <div className="clay-sm overflow-hidden p-1.5" style={{ borderRadius: 22 }}>
        <div className="h-64 overflow-hidden sm:h-80" style={{ borderRadius: 16 }}>
          <MapContainer center={value ? [value.lat, value.lng] : DEFAULT_CENTER} zoom={value ? 15 : 11} className="h-full w-full">
            <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <ClickToPlace onPick={pickManual} />
            <FlyTo position={value} />
            {value && (
              <Marker
                position={[value.lat, value.lng]}
                icon={pickerIcon}
                draggable
                eventHandlers={{ dragend: (e) => pickManual(e.target.getLatLng()) }}
              />
            )}
          </MapContainer>
        </div>
      </div>
      {value ? (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-success-800" role="status">
          <Icon name="check" size={16} />
          Location set: {value.lat.toFixed(5)}, {value.lng.toFixed(5)} ({value.source === 'gps' ? 'from GPS' : 'selected on map'})
        </p>
      ) : (
        <p className="hint">No location selected yet.</p>
      )}
    </div>
  )
}
