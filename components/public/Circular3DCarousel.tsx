"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Trophy, Calendar, Target, Shield, Info } from "lucide-react"

interface CarouselItem {
  id: number
  title: string
  description: string
  details: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const ITEMS: CarouselItem[] = [
  {
    id: 1,
    title: "Raptor Winters Survival S1",
    description: "Event Hosted - The ultimate survival challenge.",
    details: "Raptor Winters Survival S1 was a flagship event hosted by Raptor Esports, featuring top-tier teams battling in extreme conditions. The event showcased high-level strategy and raw skill, setting a new benchmark for community tournaments.",
    icon: Trophy,
    color: "from-blue-500 to-cyan-500"
  },
  {
    id: 2,
    title: "Elite Scrims Daily",
    description: "Sharpen your skills against the best.",
    details: "Join our daily elite scrims to practice against competitive teams. Organized lobbies, professional management, and detailed post-match analytics to help you improve.",
    icon: Target,
    color: "from-purple-500 to-pink-500"
  },
  {
    id: 3,
    title: "Community Cups",
    description: "Weekly tournaments for everyone.",
    details: "Open-for-all weekly community cups with prize pools. A perfect proving ground for new rosters to make a name for themselves and climb the Raptor Tier System.",
    icon: Calendar,
    color: "from-orange-500 to-red-500"
  },
  {
    id: 4,
    title: "Pro Bootcamps",
    description: "Intensive training sessions.",
    details: "Exclusive bootcamp sessions for Tier 1 and God Tier teams. Focus on macro strategy, communication drills, and specialized coaching from industry veterans.",
    icon: Shield,
    color: "from-green-500 to-emerald-500"
  }
]

export function Circular3DCarousel() {
  const [rotation, setRotation] = useState(0)
  const [selectedItem, setSelectedItem] = useState<CarouselItem | null>(null)

  // We keep isMobile logic ONLY for disabling auto-rotation logic if desired,
  // but we won't use it for conditional rendering to avoid hydration mismatches.
  // Actually, we can just let it rotate in the background on mobile (it's hidden).
  // Or use a media query listener for behavior.
  const [isHovering, setIsHovering] = useState(false)

  // Auto-rotate on desktop
  useEffect(() => {
    if (selectedItem || isHovering) return
    const interval = setInterval(() => {
      setRotation(prev => prev - 60)
    }, 4000)
    return () => clearInterval(interval)
  }, [selectedItem, isHovering])

  const handleCardClick = (item: CarouselItem) => {
    setSelectedItem(item)
  }

  return (
    <div className="w-full py-20 overflow-hidden relative min-h-[600px] flex flex-col items-center justify-center perspective-1000">
      <div className="text-center mb-16 z-10 relative px-4">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white drop-shadow-xl mb-2">Highlights & Events</h2>
        <p className="text-white/70">Click on a card to explore details</p>
      </div>

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

      {/* Desktop View: 3D Carousel - Visible only on medium+ screens */}
      <div
        className="hidden md:flex relative w-full h-[400px] items-center justify-center"
        style={{ perspective: "1000px" }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div
          className="relative w-[300px] h-[200px]"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateY(${rotation}deg)`,
            transition: "transform 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
          }}
        >
          {ITEMS.map((item, index) => {
            const angle = (360 / ITEMS.length) * index
            // Calculate positioning on a circle
            // TranslateZ pushes them out to form a circle
            const radius = 350

            return (
              <div
                key={item.id}
                className="absolute top-0 left-0 w-full h-full"
                style={{
                  transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                }}
              >
                <Card
                  className={`w-full h-[220px] bg-gradient-to-br ${item.color} border-white/20 text-white cursor-pointer hover:brightness-110 transition-all shadow-2xl backdrop-blur-sm`}
                  onClick={() => handleCardClick(item)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="p-2 bg-white/20 rounded-full">
                        <item.icon className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-xs font-mono bg-black/30 px-2 py-1 rounded">#{item.id}</span>
                    </div>
                    <CardTitle className="text-xl mt-2">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/90 text-sm line-clamp-3">{item.description}</p>
                    <div className="mt-4 text-xs font-semibold text-white/80 flex items-center justify-end gap-1">
                      View Details <Target className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      </div>

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
                <p className="leading-relaxed text-white/90">
                  {selectedItem.details}
                </p>
                <div className="p-4 bg-white/10 rounded-lg border border-white/10 text-sm">
                  <span className="text-blue-300 font-semibold">Tip:</span> Join our Discord to participate in upcoming events like this!
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
