"use client"

import React from "react"
import { VideoBackground } from "@/components/video-background"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FadeInOnScroll } from "@/components/ui/fade-in-on-scroll"
import { Calendar, Sparkles, Trophy, Users } from "lucide-react"
import { PublicNavigation } from "@/components/public/PublicNavigation"
import { PublicFooter } from "@/components/public/PublicFooter"

export default function AboutPage() {
  return (
    <VideoBackground>
      <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto">
        <PublicNavigation />
        
        {/* Hero */}
        <section className="relative h-[52vh] sm:h-[60vh] w-full pt-14">
          <div className="absolute inset-0">
            {/* Replace with blurred collage image via CSS background */}
            <div className="h-full w-full bg-[url('/images/about-collage.jpg')] bg-cover bg-center blur-[2px] brightness-[.65]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          </div>
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
            <FadeInOnScroll>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white drop-shadow-xl">Powered by AI. Backed by Raptor.</h1>
            </FadeInOnScroll>
            <FadeInOnScroll delayMs={120}>
              <p className="mt-3 max-w-3xl text-white/80">
                Founded in 2025, Raptor Esports combines competitive excellence with cutting-edge technology to empower players.
              </p>
            </FadeInOnScroll>
          </div>
        </section>

        {/* Intro */}
        <section className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid md:grid-cols-3 gap-6">
            <FadeInOnScroll delayMs={0}>
              <Card>
                <CardHeader>
                  <CardTitle>Our Vision</CardTitle>
                </CardHeader>
                <CardContent className="text-white/80">
                  Elevate Indian esports with a modern, data-driven ecosystem that nurtures winners.
                </CardContent>
              </Card>
            </FadeInOnScroll>
            <FadeInOnScroll delayMs={200}>
              <Card>
                <CardHeader>
                  <CardTitle>What Drives Us</CardTitle>
                </CardHeader>
                <CardContent className="text-white/80">
                  Discipline, consistency, and innovation — backed by AI-powered insights.
                </CardContent>
              </Card>
            </FadeInOnScroll>
            <FadeInOnScroll delayMs={400}>
              <Card>
                <CardHeader>
                  <CardTitle>Players First</CardTitle>
                </CardHeader>
                <CardContent className="text-white/80">
                  Transparent frameworks, fair incentives, and clear progression paths.
                </CardContent>
              </Card>
            </FadeInOnScroll>
          </div>
        </section>

        {/* Milestones */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <FadeInOnScroll>
            <h2 className="text-3xl font-bold text-white mb-6">Milestones</h2>
          </FadeInOnScroll>
          <div className="max-w-2xl ml-0 mr-auto">
            <FadeInOnScroll>
              <TimelineCard year="2025" items={[
                "May — Organization established.",
                "June — Incentive program launched.",
                "July — Tier system + Instagram presence.",
                "August — AI-driven performance platform launched.",
              ]} />
            </FadeInOnScroll>
          </div>
        </section>

        {/* What We Offer */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <FadeInOnScroll>
            <h2 className="text-3xl font-bold text-white mb-6">What We Offer</h2>
          </FadeInOnScroll>
          <div className="grid md:grid-cols-3 gap-6">
            <FadeInOnScroll delayMs={0}>
              <Card>
                <CardHeader>
                  <CardTitle>Sponsorship</CardTitle>
                </CardHeader>
                <CardContent className="text-white/80">
                  Support for top-performing teams and talent with comprehensive backing.
                </CardContent>
              </Card>
            </FadeInOnScroll>
            <FadeInOnScroll delayMs={200}>
              <Card>
                <CardHeader>
                  <CardTitle>Training</CardTitle>
                </CardHeader>
                <CardContent className="text-white/80">
                  Coaching, VOD reviews, and structured practice programs.
                </CardContent>
              </Card>
            </FadeInOnScroll>
            <FadeInOnScroll delayMs={400}>
              <Card>
                <CardHeader>
                  <CardTitle>Data Tools</CardTitle>
                </CardHeader>
                <CardContent className="text-white/80">
                  AI insights, analytics dashboards, and performance tracking.
                </CardContent>
              </Card>
            </FadeInOnScroll>
          </div>
        </section>

        {/* Achievements */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <FadeInOnScroll>
            <h2 className="text-3xl font-bold text-white mb-6">Achievements</h2>
          </FadeInOnScroll>
          <div className="grid md:grid-cols-3 gap-6">
            <FadeInOnScroll delayMs={0}>
              <Card>
                <CardHeader>
                  <CardTitle>2025 Establishment</CardTitle>
                </CardHeader>
                <CardContent className="text-white/80">Rapidly growing community and structured programs launched.</CardContent>
              </Card>
            </FadeInOnScroll>
            <FadeInOnScroll delayMs={200}>
              <Card>
                <CardHeader>
                  <CardTitle>AI Platform</CardTitle>
                </CardHeader>
                <CardContent className="text-white/80">Deployed performance analytics and curated insights engine.</CardContent>
              </Card>
            </FadeInOnScroll>
            <FadeInOnScroll delayMs={400}>
              <Card>
                <CardHeader>
                  <CardTitle>Scrim Success</CardTitle>
                </CardHeader>
                <CardContent className="text-white/80">Consistent finishes and momentum across multiple rosters.</CardContent>
              </Card>
            </FadeInOnScroll>
          </div>
        </section>

        <PublicFooter />
      </div>
    </VideoBackground>
  )
}

function TimelineCard({ year, items }: { year: string; items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{year}</CardTitle>
      </CardHeader>
      <CardContent className="text-white/80 space-y-2">
        {items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </CardContent>
    </Card>
  )
}

function Offer({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-white/5 rounded p-3">
      <div className="flex items-center gap-2 text-white/90">
        {icon}
        <span className="font-semibold">{title}</span>
      </div>
      <div className="text-white/70 text-sm mt-1">{desc}</div>
    </div>
  )
}