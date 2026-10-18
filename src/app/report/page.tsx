'use client'

import { useRouter } from 'next/navigation'
import SiteHeader from '@/components/common/SiteHeader'
import ReportForm from '@/components/reports/ReportForm'

// Stage 4 - Emergency reporting. The wizard posts to /api/reports and then opens the status page.
export default function ReportPage() {
  const router = useRouter()
  return (
    <div className="page">
      <SiteHeader />
      <main id="main" className="container-x py-8 sm:py-12">
        <header className="rise max-w-2xl">
          <h1 className="text-4xl font-semibold sm:text-5xl">Tell us what is happening</h1>
          <p className="mt-3 text-lg text-ink-700">
            Only your location is required. Answer what you can: it helps responders reach the most urgent cases first.
          </p>
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-warning-100 p-3.5 text-[15px] font-semibold text-ink-900 lg:hidden">
            If a life is in danger and phones work, also call Rescue 1122.
          </p>
        </header>
        <div className="rise rise-1 mt-8">
          <ReportForm onSubmitted={(report) => router.push(`/report/${report.id}?sent=1`)} />
        </div>
      </main>
    </div>
  )
}
