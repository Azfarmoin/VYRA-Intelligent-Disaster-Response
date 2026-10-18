import type {
  Danger,
  EvacuationAbility,
  InjurySeverity,
  MedicalNeed,
  Priority,
  Status,
  Vulnerability,
} from './constants'

export interface TriageOverride {
  priority: Priority
  reason: string
  by: string
  at: string
}

// One row of public.emergency_reports (schema.sql + migration 002).
export interface ReportRow {
  id: string
  reporter_id: string | null
  client_id: string | null
  location_lat: number
  location_lng: number
  location_address: string | null
  location_source: 'gps' | 'manual'
  location_accuracy_m: number | null
  area: string | null
  people_count: number | null // null = unknown
  immediate_danger: boolean
  dangers: Danger[]
  danger_details: string | null
  injury_severity: InjurySeverity
  injury_count: number | null
  injury_details: string | null
  medical_need_types: MedicalNeed[]
  medical_needs: string | null // free-text details
  can_evacuate: EvacuationAbility
  vulnerabilities: Vulnerability[]
  contact_info: string | null
  status: Status
  verified: boolean
  resolved_at: string | null
  triage_override: TriageOverride | null
  priority_score: number
  priority_explanation: unknown
  created_at: string
  updated_at: string
}

export type NewReport = Omit<ReportRow, 'id' | 'created_at' | 'updated_at'>

export interface ReportEvent {
  id: string
  report_id: string
  action: 'created' | 'status' | 'verify' | 'override' | 'override_cleared'
  actor: string
  from_value: string | null
  to_value: string | null
  note: string | null
  created_at: string
}

export interface TriageFactor {
  key: string
  category: string
  points: number
  detail: string
}

export interface TriageResult {
  version: string
  computedAt: string
  score: number
  scorePriority: Priority
  suggestedPriority: Priority
  factors: TriageFactor[]
  safetyRules: string[]
  flags: string[]
  unknowns: string[]
  waitingMinutes: number
  summary: string
}

// A report as the dashboard and map see it.
export interface TriagedReport extends ReportRow {
  triage: TriageResult
  overridden: boolean
  priority: Priority // effective: the override if present, else the suggestion
}

export interface Shelter {
  id: string
  name: string
  location_lat: number
  location_lng: number
  address: string | null
  area: string | null
  capacity: number | null
  current_occupancy: number | null
  services: string[] | null
  status: 'open' | 'full' | 'closed'
  verified: boolean
}

export interface RescueTeam {
  id: string
  team_name: string
  team_type: string | null
  capabilities: string[] | null
  current_location_lat: number
  current_location_lng: number
  area: string | null
  status: 'available' | 'assigned' | 'unavailable'
  verified: boolean
}

export interface BlockedRoad {
  id: string
  description: string
  reason: string
  area: string | null
  path: [number, number][] // [lat, lng] points
  verified: boolean
}

export interface ReportSummary {
  total: number
  byPriority: Record<Priority, number>
  byStatus: Partial<Record<Status, number>>
  overridden: number
  unverified: number
}
