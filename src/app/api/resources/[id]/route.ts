import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/serverDb'
import { RESOURCE_TYPES } from '@/lib/matching'

const STATUSES = ['available', 'in_use', 'maintenance']

const EDITABLE_FIELDS = ['resource_type', 'name', 'quantity', 'team_id', 'status', 'notes']

// PATCH update resource (status, quantity, owning team...)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const update: Record<string, unknown> = {}
    for (const field of EDITABLE_FIELDS) {
      if (field in body) update[field] = body[field]
    }

    if ('quantity' in update && (!Number.isInteger(update.quantity) || (update.quantity as number) < 0)) {
      return NextResponse.json({ error: 'quantity must be a whole number, 0 or more' }, { status: 400 })
    }
    if (update.status === 'in_use') {
      return NextResponse.json({ error: 'Supplies are marked in use by creating a dispatch.' }, { status: 400 })
    }
    if ('status' in update && !STATUSES.includes(update.status as string)) {
      return NextResponse.json({ error: `Invalid status: ${update.status}` }, { status: 400 })
    }
    if ('resource_type' in update && !RESOURCE_TYPES.some(t => t.value === update.resource_type)) {
      return NextResponse.json({ error: `Unknown resource type: ${update.resource_type}` }, { status: 400 })
    }
    if (!Object.keys(update).length) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('resources')
      .update(update)
      .eq('id', params.id)
      .select('*, rescue_teams(team_name)')
      .single()

    if (error) {
      const missing = error.code === 'PGRST116'
      return NextResponse.json({ error: missing ? 'Resource not found' : error.message }, { status: missing ? 404 : 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE remove resource
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: current } = await supabase.from('resources').select('status').eq('id', params.id).maybeSingle()
    if (current?.status === 'in_use') {
      return NextResponse.json({ error: 'These supplies are in use on a mission and cannot be deleted.' }, { status: 409 })
    }
    const { error } = await supabase.from('resources').delete().eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
