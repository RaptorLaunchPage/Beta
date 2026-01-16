"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, Trophy, IndianRupee, Target } from "lucide-react"

interface StatsMarqueeProps {
  stats: {
    teamsCount: number
    playersCount: number
    totalMatches: number
    totalWWCD: number
    costCovered: number
  }
}

interface MarqueeItem {
  id: number
  title: string
  value: number | string
  description: string
  details: string
  icon: React.ComponentType<{ className?: string }>
}

export function StatsMarquee({ stats }: StatsMarqueeProps) {
  const ITEMS: MarqueeItem[] = [
    {
      id: 1,
      title: "Active Teams",
      value: stats.teamsCount,
      description: "Teams currently competing.",
      details: "Join the roster and make your mark!",
      icon: Users,
    },
    {
      id: 2,
      title: "Active Players",
      value: stats.playersCount,
      description: "Total registered players.",
      details: "Connect, compete, and climb the leaderboards.",
      icon: Users,
    },
    {
      id: 3,
      title: "Total Matches",
      value: stats.totalMatches,
      description: "matches played till date.",
      details: "High-quality scrims and tournaments.",
      icon: Calendar,
    },
    {
      id: 4,
      title: "Total WWCD",
      value: stats.totalWWCD,
      description: "Chicken dinners awarded.",
      details: "Victory is earned, not given.",
      icon: Trophy,
    },
    {
      id: 5,
      title: "Cost Covered",
      value: `₹${stats.costCovered}`,
      description: "Total prize pool/expenses.",
      details: "We invest in our community.",
      icon: IndianRupee,
    },
    {
      id: 6,
      title: "Event Hosted",
      value: "Raptor Winters",
      description: "Survival S1 Completed",
      details: "Premier community tournament series.",
      icon: Target,
    }
  ]

  // Duplicate items to create seamless loop
  const marqueeItems = [...ITEMS, ...ITEMS, ...ITEMS]

  return (
    <div className="w-full py-16 overflow-hidden relative flex flex-col items-center">
      <div className="text-center mb-10 px-4 z-10">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white drop-shadow-xl mb-2">Highlights & Events</h2>
        <p className="text-white/70">Real-time platform statistics</p>
      </div>

      <div className="w-full relative overflow-hidden group">
        {/* Gradient Masks for smooth fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-black/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black/80 to-transparent z-10 pointer-events-none" />

        <div className="flex gap-6 w-max animate-marquee-reverse hover:pause px-4">
          {marqueeItems.map((item, index) => (
            <div key={`${item.id}-${index}`} className="w-[300px] sm:w-[350px] flex-shrink-0">
              <Card className="h-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border-white/10 text-white shadow-xl hover:shadow-2xl hover:bg-white/15 transition-all duration-300">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg border border-white/10">
                      <item.icon className="h-5 w-5 text-blue-300" />
                    </div>
                    <CardTitle className="text-lg font-bold text-white/90">{item.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-extrabold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent w-fit">
                    {item.value}
                  </div>
                  <p className="text-white/80 font-medium text-sm mb-2">{item.description}</p>
                  <p className="text-white/50 text-xs leading-relaxed border-t border-white/10 pt-2">
                    {item.details}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
