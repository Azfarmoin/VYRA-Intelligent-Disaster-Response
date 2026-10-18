import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { DataStore, ReportFilter } from './store'
import { StoreError } from './store'
import type { ReportRow } from '../types'

const REPORT_NUMERIC = ['location_lat', 'location_lng', 'location_accuracy_m'] as const

// Postgres NUMERIC comes back as a string from PostgREST - normalise to numbers.
function normalise<T extends Record<string, unknown>>(row: T, keys: readonly string[]): T {
  const out: Record<string, unknown> = { ...row }
  for (const k of keys) if (out[k] != null) out[k] = Number(out[k])
  return out as T
}
const toReport = (r: Record<string, unknown>) => normalise(r, REPORT_NUMERIC) as unknown as ReportRow

function fail(error: { message: string; code?: string } | null, what: string): never {
  const hint = error?.code === '42703' || error?.code === 'PGRST204' ? ' - did you run supabase/migrations/002_stage4_6.sql?' : ''
  throw new StoreError(`${what}: ${error?.message}${hint}`)
}

export function createSupabaseStore(): DataStore {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const db: SupabaseClient = createClient(url, key, {
    auth: { persistSession: false },
    // Next.js 14 caches fetch() in route handlers (even across restarts, in .next/cache).
    // Emergency data must always be live, so opt every Supabase request out of that cache.
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  })

  return {
    mode: 'supabase',

    async insertReport(report) {
      const { data, error } = await db.from('emergency_reports').insert(report).select().single()
      if (error) {
        if (error.code === '23505') throw new StoreError('duplicate client_id', 409)
        fail(error, 'Could not save report')
      }
      return toReport(data)
    },

    async findReportByClientId(clientId) {
      const { data, error } = await db.from('emergency_reports').select('*').eq('client_id', clientId).maybeSingle()
      if (error) fail(error, 'Lookup failed')
      return data ? toReport(data) : null
    },

    async getReport(id) {
      const { data, error } = await db.from('emergency_reports').select('*').eq('id', id).maybeSingle()
      if (error) {
        if (error.code === '22P02') return null // not a uuid
        fail(error, 'Could not load report')
      }
      return data ? toReport(data) : null
    },

    async listReports(filter: ReportFilter) {
      let q = db.from('emergency_reports').select('*').order('created_at', { ascending: false }).limit(2000)
      if (filter.area) q = q.eq('area', filter.area)
      if (filter.statuses?.length) q = q.in('status', filter.statuses)
      if (filter.verified != null) q = q.eq('verified', filter.verified)
      if (filter.bbox) {
        const [minLng, minLat, maxLng, maxLat] = filter.bbox
        q = q.gte('location_lng', minLng).lte('location_lng', maxLng).gte('location_lat', minLat).lte('location_lat', maxLat)
      }
      const { data, error } = await q
      if (error) fail(error, 'Could not load reports')
      return (data || []).map(toReport)
    },

    async updateReport(id, patch) {
      const { data, error } = await db.from('emergency_reports').update(patch).eq('id', id).select().single()
      if (error) fail(error, 'Could not update report')
      return toReport(data)
    },

    async addEvent(event) {
      const { error } = await db.from('report_events').insert(event)
      if (error) fail(error, 'Could not record history')
    },

    async listEvents(reportId) {
      const { data, error } = await db.from('report_events').select('*').eq('report_id', reportId).order('created_at')
      if (error) fail(error, 'Could not load history')
      return data || []
    },

    async mapLayers(area) {
      const withArea = <T extends { eq: (c: string, v: string) => T }>(q: T) => (area ? q.eq('area', area) : q)
      const [s, t, r] = await Promise.all([
        withArea(db.from('shelters').select('*').eq('verified', true)),
        withArea(db.from('rescue_teams').select('*').eq('verified', true).neq('status', 'unavailable')),
        withArea(db.from('blocked_roads').select('*').eq('verified', true)),
      ])
      for (const res of [s, t, r]) if (res.error) fail(res.error, 'Could not load map layers')
      return {
        shelters: (s.data || []).map((x) => normalise(x, ['location_lat', 'location_lng'])),
        teams: (t.data || []).map((x) => normalise(x, ['current_location_lat', 'current_location_lng'])),
        roadBlocks: r.data || [],
      }
    },
  }
}
