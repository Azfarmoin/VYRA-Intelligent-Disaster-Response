import { NextRequest, NextResponse } from 'next/server'
<<<<<<< HEAD
import { supabase } from '@/lib/serverDb'
=======
import { supabase } from '@/lib/supabase'
>>>>>>> origin/main

const EDITABLE_FIELDS = ['description', 'location_lat', 'location_lng', 'radius_km', 'severity', 'active']

// PATCH update hazard (e.g. mark cleared)
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

    const { data, error } = await supabase
      .from('route_hazards')
      .update(update)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE remove hazard
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase.from('route_hazards').delete().eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
