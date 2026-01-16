"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Trophy, Users, Calendar, IndianRupee, Target, Info } from "lucide-react"

interface Circular3DCarouselProps {
  stats: {
    teamsCount: number
    playersCount: number
    totalMatches: number
    totalWWCD: number
    costCovered: number
  }
}

interface CarouselItem {
  id: number
  key: string
  title: string
  value: number | string
  description: string
  details: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

export function Circular3DCarousel({ stats }: Circular3DCarouselProps) {
  const [selectedItem, setSelectedItem] = useState<CarouselItem | null>(null)
  const [isHovering, setIsHovering] = useState(false)

  const ITEMS: CarouselItem[] = [
    {
      id: 1,
      key: 'teams',
      title: "Active Teams",
      value: stats.teamsCount,
      description: "Teams currently competing.",
      details: "The total number of active teams registered and participating in our tournaments. Join the roster and make your mark!",
      icon: Users,
      color: "from-blue-500 to-cyan-500"
    },
    {
      id: 2,
      key: 'players',
      title: "Active Players",
      value: stats.playersCount,
      description: "Total registered players.",
      details: "Our growing community of competitive players. Connect, compete, and climb the leaderboards.",
      icon: Users, // Using Users again or maybe User
      color: "from-purple-500 to-pink-500"
    },
    {
      id: 3,
      key: 'matches',
      title: "Total Matches",
      value: stats.totalMatches,
      description: "Matches hosted to date.",
      details: "We host frequent high-quality matches. Stay tuned for the next scrim or tournament schedule.",
      icon: Calendar,
      color: "from-orange-500 to-red-500"
    },
    {
      id: 4,
      key: 'wwcd',
      title: "Total WWCD",
      value: stats.totalWWCD,
      description: "Chicken dinners awarded.",
      details: "The ultimate victory! This count represents the total Number of Winner Winner Chicken Dinners awarded across all our events.",
      icon: Trophy,
      color: "from-green-500 to-emerald-500"
    },
    {
      id: 5,
      key: 'cost',
      title: "Cost Covered",
      value: `₹${stats.costCovered}`,
      description: "Total prize pool/expenses.",
      details: "We invest in our community. This figure represents the total value of prize pools and expenses covered for our players.",
      icon: IndianRupee,
      color: "from-yellow-500 to-amber-500"
    }
  ]

  const handleCardClick = (item: CarouselItem) => {
    setSelectedItem(item)
  }

  // Calculate the radius based on the number of items to space them out
  const radius = 300
  const angleStep = 360 / ITEMS.length

  return (
    <div className="w-full py-12 overflow-hidden relative min-h-[500px] flex flex-col items-center justify-center perspective-1000">

      {/* Mobile View: Horizontal Scroll / Swipe Stack - Visible only on small screens */}
      <div className="block md:hidden w-full">
        <div className="flex overflow-x-auto w-full px-6 gap-4 pb-8 no-scrollbar snap-x snap-mandatory">
          {ITEMS.map((item) => (
            <div key={item.id} className="min-w-[280px] snap-center">
              <Card
                className={`h-full bg-gradient-to-br ${item.color} border-none text-white cursor-pointer hover:scale-105 transition-transform`}
                onClick={() => handleCardClick(item)}
              >
                <CardHeader>
                  <div className="mb-2 p-2 bg-white/20 rounded-full w-fit">
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">{item.value}</div>
                  <p className="text-white/90 text-sm">{item.description}</p>
                  <div className="mt-4 flex items-center text-xs font-semibold bg-black/20 w-fit px-2 py-1 rounded">
                    <Info className="h-3 w-3 mr-1" /> Tap for details
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop View: Continuous 3D Carousel */}
      <div
        className="hidden md:flex relative w-full h-[400px] items-center justify-center"
        style={{ perspective: "1000px" }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div
          className="relative w-[250px] h-[180px]"
          style={{
            transformStyle: "preserve-3d",
            animation: isHovering ? 'none' : 'spin 20s linear infinite'
          }}
        >
          {ITEMS.map((item, index) => {
            const angle = angleStep * index
            return (
              <div
                key={item.id}
                className="absolute top-0 left-0 w-full h-full"
                style={{
                  transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                }}
              >
                <Card
                  className={`w-full h-[220px] bg-gradient-to-br ${item.color} border-white/20 text-white cursor-pointer hover:brightness-110 transition-all shadow-2xl backdrop-blur-sm backface-visible`}
                  onClick={() => handleCardClick(item)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2 bg-white/20 rounded-full">
                        <item.icon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <CardTitle className="text-lg mt-2">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-1">{item.value}</div>
                    <p className="text-white/90 text-xs line-clamp-2">{item.description}</p>
                    <div className="mt-3 text-xs font-semibold text-white/80 flex items-center justify-end gap-1">
                       Details <Target className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }
      `}</style>

      {/* Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="bg-black/90 border-white/20 text-white max-w-md sm:max-w-lg z-50">
          {selectedItem && (
            <>
              <DialogHeader>
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${selectedItem.color} flex items-center justify-center mb-4`}>
                  <selectedItem.icon className="h-6 w-6 text-white" />
                </div>
                <DialogTitle className="text-2xl">{selectedItem.title}</DialogTitle>
                <DialogDescription className="text-white/70">
                  {selectedItem.description}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="text-4xl font-bold text-center py-4">{selectedItem.value}</div>
                <p className="leading-relaxed text-white/90">
                  {selectedItem.details}
                </p>
                <div className="p-4 bg-white/10 rounded-lg border border-white/10 text-sm">
                  <span className="text-blue-300 font-semibold">Tip:</span> Use the Dashboard to track your team's real-time performance and analytics!
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
