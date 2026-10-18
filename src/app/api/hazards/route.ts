import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/serverDb'

// GET all route hazards
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('route_hazards')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create route hazard (flooded road, collapsed bridge, ...)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.description || body.location_lat == null || body.location_lng == null) {
      return NextResponse.json(
        { error: 'description, location_lat and location_lng are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('route_hazards')
      .insert({
        description: body.description,
        location_lat: body.location_lat,
        location_lng: body.location_lng,
        radius_km: body.radius_km || 1,
        severity: body.severity || 'high',
        active: true
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
