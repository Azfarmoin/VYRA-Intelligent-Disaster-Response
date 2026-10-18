import { randomUUID } from 'node:crypto'
import type { DataStore } from './store'
import { StoreError } from './store'
import type { ReportEvent, ReportRow, RescueTeam, Shelter } from '../types'
import { nearestArea } from '../constants'
import { demoReports, demoRoadBlocks } from './demoSeed'

// In-memory store for demos without Supabase (data resets when the server restarts).
export function createMemoryStore({ seed = true } = {}): DataStore {
  const reports = new Map<string, ReportRow>()
  const events: ReportEvent[] = []
  const clone = <T,>(x: T): T => structuredClone(x)

  if (seed) {
    for (const r of demoReports()) {
      reports.set(r.id, r)
      events.push({ id: randomUUID(), report_id: r.id, action: 'created', actor: 'seed', from_value: null, to_value: null, note: 'Simulated demo report', created_at: r.created_at })
      const at = (min: number) => new Date(Date.parse(r.created_at) + min * 60_000).toISOString()
      if (r.verified) events.push({ id: randomUUID(), report_id: r.id, action: 'verify', actor: 'Dispatcher (demo)', from_value: 'false', to_value: 'true', note: null, created_at: at(4) })
      if (r.status !== 'pending') events.push({ id: randomUUID(), report_id: r.id, action: 'status', actor: 'Dispatcher (demo)', from_value: 'pending', to_value: r.status, note: null, created_at: r.resolved_at && r.status === 'resolved' ? r.resolved_at : at(8) })
    }
  }

  return {
    mode: 'demo',

    async insertReport(report) {
      if (report.client_id && [...reports.values()].some((r) => r.client_id === report.client_id)) {
        throw new StoreError('duplicate client_id', 409)
      }
      const now = new Date().toISOString()
      const row: ReportRow = { ...clone(report), id: randomUUID(), created_at: now, updated_at: now }
      reports.set(row.id, row)
      return clone(row)
    },

    async findReportByClientId(clientId) {
      const r = [...reports.values()].find((x) => x.client_id === clientId)
      return r ? clone(r) : null
    },

    async getReport(id) {
      const r = reports.get(id)
      return r ? clone(r) : null
    },

    async listReports(filter) {
      return [...reports.values()]
        .filter((r) => !filter.area || r.area === filter.area)
        .filter((r) => !filter.statuses?.length || filter.statuses.includes(r.status))
        .filter((r) => filter.verified == null || r.verified === filter.verified)
        .filter((r) => {
          if (!filter.bbox) return true
          const [minLng, minLat, maxLng, maxLat] = filter.bbox
          return r.location_lng >= minLng && r.location_lng <= maxLng && r.location_lat >= minLat && r.location_lat <= maxLat
        })
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(clone)
    },

    async updateReport(id, patch) {
      const r = reports.get(id)
      if (!r) throw new StoreError('Report not found', 404)
      const updated = { ...r, ...clone(patch), id, updated_at: new Date().toISOString() }
      reports.set(id, updated)
      return clone(updated)
    },

    async addEvent(event) {
      events.push({ ...clone(event), id: randomUUID(), created_at: new Date().toISOString() })
    },

    async listEvents(reportId) {
      return events.filter((e) => e.report_id === reportId).map(clone)
    },

    async mapLayers(area) {
      // Teams and shelters come from the same demo tables the supplies page edits, so changes show on the map.
      const { demoTables } = await import('../demoDb')
      const t = await demoTables()
      const placed = (lat: unknown, lng: unknown) => typeof lat === 'number' && typeof lng === 'number'
      const teams: RescueTeam[] = t.rescue_teams
        .filter((x) => placed(x.current_location_lat, x.current_location_lng) && x.status !== 'unavailable')
        .map((x) => ({
          id: x.id, team_name: x.team_name, team_type: (x.capabilities?.[0] as string) ?? null, capabilities: x.capabilities ?? [],
          current_location_lat: x.current_location_lat, current_location_lng: x.current_location_lng,
          area: nearestArea(x.current_location_lat, x.current_location_lng), status: x.status, verified: true,
        }))
      const shelters: Shelter[] = t.shelters
        .filter((x) => placed(x.location_lat, x.location_lng))
        .map((x) => ({
          id: x.id, name: x.name, location_lat: x.location_lat, location_lng: x.location_lng, address: x.address ?? null,
          area: x.area ?? nearestArea(x.location_lat, x.location_lng), capacity: x.capacity ?? null, current_occupancy: x.current_occupancy ?? 0,
          services: x.services ?? [], status: x.status, verified: x.verified !== false,
        }))
      const inArea = <T extends { area: string | null; verified: boolean }>(x: T) => x.verified && (!area || x.area === area)
      return {
        shelters: shelters.filter(inArea),
        teams: teams.filter(inArea),
        roadBlocks: demoRoadBlocks.filter(inArea).map(clone),
      }
    },
  }
}
