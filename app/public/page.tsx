"use client"

import React, { useState, useEffect } from "react"
import { VideoBackground } from "@/components/video-background"
import { FadeInOnScroll } from "@/components/ui/fade-in-on-scroll"
import { PublicNavigation } from "@/components/public/PublicNavigation"
import { PublicFooter } from "@/components/public/PublicFooter"
import { Circular3DCarousel } from "@/components/public/Circular3DCarousel"
import { getButtonStyle } from "@/lib/global-theme"
import Link from "next/link"

export default function PublicSitePage() {
  const [stats, setStats] = useState({
    teamsCount: 0,
    playersCount: 0,
    totalMatches: 0,
    totalWWCD: 0,
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
          totalMatches: Number(s.totalMatches || 0),
          totalWWCD: Number(s.totalWWCD || 0),
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
          <section className="relative min-h-[60vh] sm:min-h-[70vh] w-full pt-24 pb-12 flex items-center justify-center">
            <div className="flex flex-col items-center justify-center text-center px-4 w-full">

              <FadeInOnScroll>
                <h1 className="text-4xl sm:text-6xl font-extrabold drop-shadow-xl text-white">
                  Next-Gen Esports Org — Powered by AI, Driven by Data & Passion.
                </h1>
              </FadeInOnScroll>
              <FadeInOnScroll delayMs={120}>
                <p className="mt-4 text-white/80 max-w-3xl mx-auto">Cinematic performance. Data-backed decisions. Build your legacy with us.</p>
              </FadeInOnScroll>
              <FadeInOnScroll delayMs={240}>
                <div className="flex gap-4 mt-8 justify-center mb-12">
                  <Link href="/join-us"
                    className={`${getButtonStyle('primary')} px-5 py-2 rounded-md font-semibold`}>
                    Join Us
                  </Link>
                  <Link href="/incentives"
                    className={`${getButtonStyle('outline')} px-5 py-2 rounded-md font-semibold`}>
                    What's Covered
                  </Link>
                </div>
              </FadeInOnScroll>

              {/* Animated Cards Section - Replaces previous Stat grid */}
              <FadeInOnScroll delayMs={360}>
                <section className="w-full max-w-6xl mx-auto">
                  <Circular3DCarousel stats={stats} />
                </section>
              </FadeInOnScroll>

            </div>
          </section>

        </div>
        
        <PublicFooter />
      </div>
    </VideoBackground>
  )
}
