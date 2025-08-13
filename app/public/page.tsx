"use client"

import React, { useState, useEffect } from "react"
import { VideoBackground } from "@/components/video-background"
import { Card, CardContent } from "@/components/ui/card"
import { FadeInOnScroll } from "@/components/ui/fade-in-on-scroll"
import { CountUp } from "@/components/ui/count-up"
import { Trophy, Users, Calendar, IndianRupee } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { PublicNavigation } from "@/components/public/PublicNavigation"
import { PublicFooter } from "@/components/public/PublicFooter"
import { getButtonStyle } from "@/lib/global-theme"

export default function PublicSitePage() {
  const [teamsCount, setTeamsCount] = useState<number>(0)
  const [playersCount, setPlayersCount] = useState<number>(0)
  const [totalMatches, setTotalMatches] = useState<number>(0)
  const [totalWWCD, setTotalWWCD] = useState<number>(0)
  const [costCovered, setCostCovered] = useState<number>(0)

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await fetch('/api/public/stats', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to fetch stats')
        const payload = await res.json()
        const s = payload.stats || {}
        setTeamsCount(Number(s.activeTeams || 0))
        setPlayersCount(Number(s.activePlayers || 0))
        setTotalMatches(Number(s.totalMatches || 0))
        setTotalWWCD(Number(s.totalWWCD || 0))
        setCostCovered(Number(s.costCovered || 0))
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
          <section className="relative h-[60vh] sm:h-[70vh] w-full pt-14">
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <FadeInOnScroll>
                <h1 className="text-4xl sm:text-6xl font-extrabold drop-shadow-xl text-white">
                  Next-Gen Esports Org — Powered by AI, Driven by Data & Passion.
                </h1>
              </FadeInOnScroll>
              <FadeInOnScroll delayMs={120}>
                <p className="mt-4 text-white/80 max-w-3xl">Cinematic performance. Data-backed decisions. Build your legacy with us.</p>
              </FadeInOnScroll>
              <FadeInOnScroll delayMs={240}>
                <div className="flex gap-4 mt-8">
                  <a href="https://discord.gg/6986Kf3eG4" target="_blank" rel="noreferrer"
                    className={`px-5 py-2 rounded-md font-semibold ${getButtonStyle('primary')}`}>
                    Join Us
                  </a>
                  <a href="/highlight"
                    className={`px-5 py-2 rounded-md font-semibold ${getButtonStyle('outline')}`}>
                    Watch Highlights
                  </a>
                </div>
              </FadeInOnScroll>
            </div>
          </section>

          {/* Stats */}
          <FadeInOnScroll as="section" className="max-w-6xl mx-auto px-4 py-10">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Stat icon={<Users className="h-5 w-5" />} label="Active Teams" value={teamsCount} />
              <Stat icon={<Users className="h-5 w-5" />} label="Active Players" value={playersCount} />
              <Stat icon={<Calendar className="h-5 w-5" />} label="Total Matches" value={totalMatches} />
              <Stat icon={<Trophy className="h-5 w-5" />} label="Total WWCD" value={totalWWCD} />
              <Stat icon={<IndianRupee className="h-5 w-5" />} label="Cost Covered" value={costCovered} prefix="₹" />
            </div>
          </FadeInOnScroll>
        </div>
        
        <PublicFooter />
      </div>
    </VideoBackground>
  )
}

function Stat({ icon, label, value, prefix }: { icon: React.ReactNode; label: string; value: number; prefix?: string }) {
  const display = value > 0 ? (
    <>
      {prefix ? <span className="mr-1">{prefix}</span> : null}
      <CountUp value={value} duration={2000} delay={500} />
    </>
  ) : (
    <span className="opacity-70">—</span>
  )
  return (
    <Card className="h-full">
      <CardContent className="p-5 sm:p-6 text-left text-white h-full flex flex-col justify-between">
        <div className="flex items-center gap-2 text-white/80 mb-2">{icon}<span className="text-xs sm:text-sm">{label}</span></div>
        <div className="font-bold tabular-nums leading-tight break-words text-[clamp(1.125rem,3.5vw,1.75rem)]">
          {display}
        </div>
      </CardContent>
    </Card>
  )
}