import { NextRequest, NextResponse } from 'next/server'
import { applyChange, detail, handleError, loadReport, parseBody } from '@/lib/reportService'
import { verifySchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

// PATCH /api/reports/:id/verify - { verified, by? }
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { verified, by } = await parseBody(request, verifySchema)
    const current = await loadReport(params.id)
    if (current.verified === verified) return NextResponse.json({ report: await detail(params.id) })
    const report = await applyChange(params.id, { verified }, { action: 'verify', actor: by, from: current.verified, to: verified })
    return NextResponse.json({ report })
  } catch (err) {
    return handleError(err)
  }
}
