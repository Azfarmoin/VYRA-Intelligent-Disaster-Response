import type { BlockedRoad, NewReport, ReportEvent, ReportRow, RescueTeam, Shelter } from '../types'
import type { Status } from '../constants'

export interface ReportFilter {
  area?: string
  statuses?: Status[]
  verified?: boolean
  bbox?: [number, number, number, number] // minLng, minLat, maxLng, maxLat
}

// Everything Stages 4-6 need from storage. Implemented by Supabase (real) and an
// in-memory demo store (local demos / no network / tests).
export interface DataStore {
  mode: 'supabase' | 'demo'
  insertReport(report: NewReport): Promise<ReportRow>
  findReportByClientId(clientId: string): Promise<ReportRow | null>
  getReport(id: string): Promise<ReportRow | null>
  listReports(filter: ReportFilter): Promise<ReportRow[]>
  updateReport(id: string, patch: Partial<ReportRow>): Promise<ReportRow>
  addEvent(event: Omit<ReportEvent, 'id' | 'created_at'>): Promise<void>
  listEvents(reportId: string): Promise<ReportEvent[]>
  mapLayers(area?: string): Promise<{ shelters: Shelter[]; teams: RescueTeam[]; roadBlocks: BlockedRoad[] }>
}

export class StoreError extends Error {
  constructor(message: string, public status = 500) {
    super(message)
  }
}
