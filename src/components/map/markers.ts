import L from 'leaflet'
import type { Priority } from '@/lib/constants'
import { PRIORITY_STYLES } from '@/lib/client'

const cache = new Map<string, L.DivIcon>()

<<<<<<< HEAD
// Urgency is encoded by size, a letter glyph and colour: ! critical, H high, M medium, L low.
// Critical markers pulse gently; unverified reports get a dashed border; * marks a priority set by a responder.
// The selected case gets an extra ring.
const GLYPH: Record<Priority, string> = { critical: '!', high: 'H', medium: 'M', low: 'L' }
// Navy text on the warm fills; white on the deeper green so the glyph stays legible.
const GLYPH_COLOR: Record<Priority, string> = { critical: '#182B3A', high: '#182B3A', medium: '#182B3A', low: '#FFFFFF' }

export function reportIcon(priority: Priority, { verified = true, overridden = false, selected = false } = {}) {
  const key = `${priority}-${verified}-${overridden}-${selected}`
  const cached = cache.get(key)
  if (cached) return cached
  const { color, size } = PRIORITY_STYLES[priority]
  const box = selected ? size + 6 : size
  const icon = L.divIcon({
    className: '',
    html: `<div class="vyra-marker ${verified ? '' : 'unverified'} ${priority === 'critical' ? 'pulse' : ''} ${selected ? 'selected' : ''}"
             style="width:${box}px;height:${box}px;background:${color};color:${GLYPH_COLOR[priority]};--pulse:${color}">${GLYPH[priority]}${overridden ? '*' : ''}</div>`,
    iconSize: [box, box],
    iconAnchor: [box / 2, box / 2],
    popupAnchor: [0, -box / 2],
=======
// Size and colour encode urgency; critical markers pulse; unverified reports get a dashed border;
// * marks a priority set by a responder.
export function reportIcon(priority: Priority, { verified = true, overridden = false } = {}) {
  const key = `${priority}-${verified}-${overridden}`
  const cached = cache.get(key)
  if (cached) return cached
  const { color, size } = PRIORITY_STYLES[priority]
  const letter = { critical: '!', high: 'H', medium: 'M', low: 'L' }[priority]
  const icon = L.divIcon({
    className: '',
    html: `<div class="vyra-marker ${verified ? '' : 'unverified'} ${priority === 'critical' ? 'pulse' : ''}"
             style="width:${size}px;height:${size}px;background:${color};--pulse:${color}">${letter}${overridden ? '*' : ''}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
>>>>>>> origin/main
  })
  cache.set(key, icon)
  return icon
}

<<<<<<< HEAD
const squareIcon = (emoji: string, bg: string, fg = '#182B3A') =>
  L.divIcon({
    className: '',
    html: `<div class="vyra-square" style="width:30px;height:30px;background:${bg};color:${fg}">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  })

// Open shelters are sea-green, closed ones are muted sand.
export const shelterIcon = (status: string) => squareIcon('🏠', status === 'open' ? '#CFE3D9' : '#EBE1D2')

const TEAM_EMOJI: Record<string, string> = { boat: '🚤', medical: '⚕️', search_rescue: '🦺', fire: '🚒', logistics: '🚚' }
// Available teams are solid navy; busy teams are a lighter slate.
export const teamIcon = (type: string | null, status: string) =>
  status === 'available' ? squareIcon(TEAM_EMOJI[type || ''] || '👥', '#182B3A', '#FFFFFF') : squareIcon(TEAM_EMOJI[type || ''] || '👥', '#B2BEC8')

export const pickerIcon = L.divIcon({
  className: '',
  html: '<div class="vyra-marker" style="width:22px;height:22px;background:#F47755"></div>',
=======
const squareIcon = (emoji: string, bg: string) =>
  L.divIcon({
    className: '',
    html: `<div class="vyra-square" style="width:28px;height:28px;background:${bg}">${emoji}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  })

export const shelterIcon = (status: string) => squareIcon('🏠', status === 'open' ? '#16A34A' : '#94A3B8')

const TEAM_EMOJI: Record<string, string> = { boat: '🚤', medical: '⚕️', search_rescue: '🦺', fire: '🚒', logistics: '🚚' }
export const teamIcon = (type: string | null, status: string) =>
  squareIcon(TEAM_EMOJI[type || ''] || '👥', status === 'available' ? '#4F46E5' : '#A5B4FC')

export const pickerIcon = L.divIcon({
  className: '',
  html: '<div class="vyra-marker" style="width:22px;height:22px;background:#DC2626"></div>',
>>>>>>> origin/main
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})
