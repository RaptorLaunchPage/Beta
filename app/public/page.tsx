"use client"

import React, { useState, useEffect } from "react"
import { VideoBackground } from "@/components/video-background"
import { FadeInOnScroll } from "@/components/ui/fade-in-on-scroll"
import { PublicNavigation } from "@/components/public/PublicNavigation"
import { PublicFooter } from "@/components/public/PublicFooter"
import { StatsMarquee } from "@/components/public/StatsMarquee"
import { getButtonStyle } from "@/lib/global-theme"
import Link from "next/link"

export default function PublicSitePage() {
  const [stats, setStats] = useState({
    teamsCount: 0,
    playersCount: 0,
    totalMatches: 5289,
    totalWWCD: 2198,
    costCovered: 0
  })

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await fetch('/api/public/stats', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to fetch stats')
        const payload = await res.json()
        const s = payload.stats || {}
        setStats({
          teamsCount: Number(s.activeTeams || 0),
          playersCount: Number(s.activePlayers || 0),
          totalMatches: 5289 + Number(s.totalMatches || 0),
          totalWWCD: 2198 + Number(s.totalWWCD || 0),
          costCovered: Number(s.costCovered || 0)
        })
      } catch {}
    }
    fetchCounts()
    const interval = setInterval(fetchCounts, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <VideoBackground>
      <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto flex flex-col">
        <PublicNavigation />
        
        <div className="flex-1">
          {/* Hero */}
          <section className="relative min-h-[40vh] sm:min-h-[50vh] w-full pt-28 pb-0 flex items-center justify-center">
            <div className="flex flex-col items-center justify-center text-center px-4 w-full">

              <FadeInOnScroll>
                <h1 className="text-4xl sm:text-6xl font-extrabold drop-shadow-xl text-white">
                  Next-Gen Esports Org — Powered by AI, Driven by Data & Passion.
                </h1>
              </FadeInOnScroll>
              <FadeInOnScroll delayMs={120}>
                <p className="mt-4 text-white/80 max-w-3xl mx-auto">Cinematic performance. Data-backed decisions. Build your legacy with us.</p>
              </FadeInOnScroll>

            </div>
          </section>

          {/* Marquee Section */}
          <FadeInOnScroll delayMs={300}>
            <section className="w-full">
              <StatsMarquee stats={stats} />
            </section>
          </FadeInOnScroll>

        </div>
        
        <PublicFooter />
      </div>
    </VideoBackground>
  )
}
