"use client"

import React, { useMemo, useState } from "react"
import { VideoBackground } from "@/components/video-background"
import { PublicNavigation } from "@/components/public/PublicNavigation"
import { PublicFooter } from "@/components/public/PublicFooter"
import { FadeInOnScroll } from "@/components/ui/fade-in-on-scroll"
import { getButtonStyle } from "@/lib/global-theme"
import Link from "next/link"
import Image from "next/image"
import { ResponsiveTabs, TabsContent } from "@/components/ui/enhanced-tabs"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Camera, Play, Dumbbell, LayoutDashboard } from "lucide-react"

// Demo image data (paths should map to public/images/...)
const IMAGES = [
  { id: 1, src: "/images/gallery/gameplay-1.jpg", alt: "Gameplay 1", category: "gameplay", w: 1600, h: 900 },
  { id: 2, src: "/images/gallery/gameplay-2.jpg", alt: "Gameplay 2", category: "gameplay", w: 1600, h: 900 },
  { id: 3, src: "/images/gallery/training-1.jpg", alt: "Training 1", category: "training", w: 1600, h: 900 },
  { id: 4, src: "/images/gallery/training-2.jpg", alt: "Training 2", category: "training", w: 1600, h: 900 },
  { id: 5, src: "/images/gallery/dashboard-1.jpg", alt: "Dashboard 1", category: "dashboard", w: 1600, h: 900 },
  { id: 6, src: "/images/gallery/dashboard-2.jpg", alt: "Dashboard 2", category: "dashboard", w: 1600, h: 900 },
  { id: 7, src: "/images/gallery/gameplay-3.jpg", alt: "Gameplay 3", category: "gameplay", w: 1600, h: 900 },
  { id: 8, src: "/images/gallery/training-3.jpg", alt: "Training 3", category: "training", w: 1600, h: 900 },
]

export default function GalleryPage() {
  const [active, setActive] = useState<string>("all")
  const [lightbox, setLightbox] = useState<{ open: boolean; image?: typeof IMAGES[number] }>({ open: false })

  const tabs = useMemo(() => ([
    { value: "all", label: "All", icon: Camera },
    { value: "gameplay", label: "Gameplay", icon: Play },
    { value: "training", label: "Training", icon: Dumbbell },
    { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  ]), [])

  const filtered = useMemo(() => {
    if (active === "all") return IMAGES
    return IMAGES.filter(img => img.category === active)
  }, [active])

  return (
    <VideoBackground>
      <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto">
        <PublicNavigation />

        {/* SECTION 1 — Hero */}
        <section className="relative h-[45vh] sm:h-[52vh] w-full pt-14">
          <div className="absolute inset-0">
            <div className="h-full w-full bg-gradient-to-b from-black/70 via-black/40 to-transparent" />
          </div>
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
            <FadeInOnScroll>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white drop-shadow-xl">Raptor Moments</h1>
            </FadeInOnScroll>
            <FadeInOnScroll delayMs={120}>
              <p className="mt-3 max-w-3xl text-white/80">
                A glimpse into our matches, training sessions, and behind-the-scenes hustle.
              </p>
            </FadeInOnScroll>
          </div>
        </section>

        {/* SECTION 2 — Tabs */}
        <section className="max-w-6xl mx-auto px-4 py-6">
          <ResponsiveTabs
            tabs={tabs}
            defaultValue="all"
            value={active}
            onValueChange={setActive}
            className="mb-2"
            variant="underline"
            size="md"
          >
            <TabsContent value={active}>
              {/* Nothing here; grid below updates reactively */}
            </TabsContent>
          </ResponsiveTabs>
        </section>

        {/* SECTION 3 — Image Grid */}
        <section className="max-w-6xl mx-auto px-4 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((img, idx) => (
              <FadeInOnScroll key={img.id} delayMs={idx * 60}>
                <button
                  className="group relative block w-full overflow-hidden rounded-lg bg-black/40 border border-white/10"
                  onClick={() => setLightbox({ open: true, image: img })}
                >
                  <div className="relative w-full h-40 sm:h-44 md:h-48 lg:h-52 xl:h-56">
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 25vw, 25vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      loading={idx > 4 ? "lazy" : "eager"}
                      priority={idx < 2}
                    />
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300" />
                </button>
              </FadeInOnScroll>
            ))}
          </div>
        </section>

        {/* SECTION 4 — Highlight Strip (Optional) */}
        <FadeInOnScroll as="section" className="w-full pt-2">
          <div className="max-w-6xl mx-auto px-4 pb-10">
            <div className="overflow-x-auto no-scrollbar">
              <div className="flex gap-3 min-w-max">
                {IMAGES.slice(0, 6).map((img, idx) => (
                  <div key={`strip-${img.id}`} className="relative h-28 w-44 sm:h-32 sm:w-56 md:h-36 md:w-64 rounded-lg overflow-hidden border border-white/10">
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      sizes="25vw"
                      className="object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeInOnScroll>

        {/* SECTION 5 — CTA */}
        <section className="w-full">
          <div className="max-w-6xl mx-auto px-4 pb-12">
            <div className={`rounded-xl p-8 sm:p-10 text-center`}>
              <FadeInOnScroll>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">Be part of the action. Your next moment could be here.</h3>
              </FadeInOnScroll>
              <FadeInOnScroll delayMs={120}>
                <Link href="/join-us" className={`inline-flex items-center gap-2 px-5 py-2 rounded-md font-semibold ${getButtonStyle('primary')}`}>
                  Apply Now
                </Link>
              </FadeInOnScroll>
            </div>
          </div>
        </section>

        {/* Lightbox Dialog */}
        <Dialog open={lightbox.open} onOpenChange={(open) => setLightbox({ open })}>
          <DialogContent className="max-w-5xl bg-black/90 border-white/20 p-0">
            {lightbox.image && (
              <div className="relative w-full h-[70vh]">
                <Image
                  src={lightbox.image.src}
                  alt={lightbox.image.alt}
                  fill
                  sizes="100vw"
                  className="object-contain"
                  priority
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        <PublicFooter />
      </div>
    </VideoBackground>
  )
}