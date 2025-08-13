"use client"

import { VideoBackground } from "@/components/video-background"
import { PublicNavigation } from "@/components/public/PublicNavigation"
import { PublicFooter } from "@/components/public/PublicFooter"

export default function HighlightPage() {
  return (
    <VideoBackground>
      <div className="min-h-screen flex flex-col">
        <PublicNavigation />
        <main className="flex-1 flex items-center justify-center p-4 pt-20">
          <div className="w-full max-w-4xl">
            <video controls autoPlay playsInline className="w-full h-[46vh] sm:h-[60vh] object-cover rounded-md">
              <source src="/highlight.mp4" type="video/mp4" />
            </video>
          </div>
        </main>
        <PublicFooter />
      </div>
    </VideoBackground>
  )
}