import type { Metadata, Viewport } from "next"
import { Fraunces, Hanken_Grotesk } from "next/font/google"
import "leaflet/dist/leaflet.css"
import "./globals.css"
import SyncStatus from "@/components/SyncStatus"

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap", axes: ["SOFT", "opsz"] })
const body = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-body", display: "swap" })

export const metadata: Metadata = {
  applicationName: "VYRA",
  title: "VYRA — Vulnerability, Yielded Response & Assistance",
  description: "Ask for help in about a minute. Responders see the most urgent cases first, with the reasons why.",
}

export const viewport: Viewport = { themeColor: "#F6F0E7" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-sans antialiased">
        <a href="#main" className="skip-link">Skip to content</a>
        {children}
        <SyncStatus />
      </body>
    </html>
  )
}
