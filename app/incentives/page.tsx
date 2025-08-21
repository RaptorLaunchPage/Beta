"use client"

import React from "react"
import { VideoBackground } from "@/components/video-background"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FadeInOnScroll } from "@/components/ui/fade-in-on-scroll"
import { Button } from "@/components/ui/button"
import { PublicNavigation } from "@/components/public/PublicNavigation"
import { PublicFooter } from "@/components/public/PublicFooter"

export default function IncentivesPage() {
  return (
    <VideoBackground>
      <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto">
        <PublicNavigation />
        
        {/* Hero */}
        <section className="relative h-[48vh] sm:h-[56vh] w-full pt-14">
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
            <FadeInOnScroll>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white drop-shadow-xl">Earn more as you climb the ranks.</h1>
            </FadeInOnScroll>
            <FadeInOnScroll delayMs={120}>
              <p className="mt-3 max-w-3xl text-white/80">
                Performance-based rewards, cost coverage, and perks that scale with your tier.
              </p>
            </FadeInOnScroll>
          </div>
        </section>

        {/* Incentives List */}
        <section className="max-w-6xl mx-auto px-4 py-10">
          <FadeInOnScroll>
            <h2 className="text-3xl font-bold text-white mb-6">Rewards</h2>
          </FadeInOnScroll>
          <div className="grid md:grid-cols-3 gap-6">
            <FadeInOnScroll delayMs={0}>
              <Card>
                <CardHeader>
                  <CardTitle>Paid practice scrims</CardTitle>
                </CardHeader>
                <CardContent className="text-white/80">Compensated practice hours to reward consistency and effort.</CardContent>
              </Card>
            </FadeInOnScroll>
            <FadeInOnScroll delayMs={200}>
              <Card>
                <CardHeader>
                  <CardTitle>AI performance tools</CardTitle>
                </CardHeader>
                <CardContent className="text-white/80">Full access to analytics, curated insights, and performance dashboards.</CardContent>
              </Card>
            </FadeInOnScroll>
            <FadeInOnScroll delayMs={400}>
              <Card>
                <CardHeader>
                  <CardTitle>Attendance monitoring</CardTitle>
                </CardHeader>
                <CardContent className="text-white/80">Track training and match participation to unlock rewards.</CardContent>
              </Card>
            </FadeInOnScroll>
          </div>
        </section>

        {/* Tier-Based Rewards Table */}
        <FadeInOnScroll as="section" className="max-w-6xl mx-auto px-4 py-10">
          <h2 className="text-3xl font-bold text-white mb-6">Tier-Based Rewards</h2>
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/40 backdrop-blur-md">
            <table className="min-w-full text-left text-white/90 border-separate border-spacing-y-2">
              <thead className="text-white/70">
                <tr>
                  <th className="px-3 py-2">Tier</th>
                  <th className="px-3 py-2">Wildcards</th>
                  <th className="px-3 py-2">Data Support</th>
                  <th className="px-3 py-2">Accessories & Gear</th>
                  <th className="px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { tier: "T4", wc: "-", data: "Basic", gear: "-", notes: "Entry level." },
                  { tier: "T3", wc: "Limited", data: "Enhanced", gear: "Basic", notes: "Developing." },
                  { tier: "T2", wc: "Moderate", data: "Full", gear: "Standard", notes: "Competitive." },
                  { tier: "T1", wc: "High", data: "Full + Coaching", gear: "Premium", notes: "Tournament-ready." },
                  { tier: "God Tier", wc: "Max", data: "Elite + Analyst", gear: "Elite", notes: "Top performers." },
                ].map((r) => (
                  <tr key={r.tier} className={`rounded bg-black/50 backdrop-blur-sm border border-white/10 ${r.tier === 'T1' || r.tier === 'God Tier' ? 'outline outline-1 outline-white/20' : ''}`}>
                    <td className="px-3 py-3 font-semibold">{r.tier}</td>
                    <td className="px-3 py-3">{r.wc}</td>
                    <td className="px-3 py-3">{r.data}</td>
                    <td className="px-3 py-3">{r.gear}</td>
                    <td className="px-3 py-3 text-white/70">{r.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FadeInOnScroll>

        {/* Winning Share Perks */}
        <FadeInOnScroll as="section" className="max-w-6xl mx-auto px-4 py-10">
          <h2 className="text-3xl font-bold text-white mb-4">Winning Share Perks</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Policy Overview</CardTitle>
              </CardHeader>
              <CardContent className="text-white/80 space-y-2">
                <p>We follow a cost-coverage-first policy to reduce financial pressure on players.</p>
                <p>After covering costs, surpluses are split fairly with a team-favored approach.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Example</CardTitle>
              </CardHeader>
              <CardContent className="text-white/80 space-y-2">
                <p>Major tournaments (over ₹20k) are split 50/50 after expense deduction.</p>
                <p>More wins unlock higher tiers, increasing your benefits.</p>
              </CardContent>
            </Card>
          </div>
        </FadeInOnScroll>

        {/* Gamified Visual */}
        <FadeInOnScroll as="section" className="max-w-6xl mx-auto px-4 py-10">
          <h2 className="text-3xl font-bold text-white mb-6">Progression Ladder</h2>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {/* On mobile: God at top to T4 bottom; on sm+: left-to-right T4->God visually */}
            <div className="rounded p-4 text-center bg-white/15 order-1 sm:order-[5]">
              <div className="text-xl font-bold text-white">God</div>
              <div className="text-white/70 text-sm">Dominate</div>
            </div>
            <div className="rounded p-4 text-center bg-white/15 order-2 sm:order-[4]">
              <div className="text-xl font-bold text-white">T1</div>
              <div className="text-white/70 text-sm">Contend</div>
            </div>
            <div className="rounded p-4 text-center bg-white/10 order-3 sm:order-[3]">
              <div className="text-xl font-bold text-white">T2</div>
              <div className="text-white/70 text-sm">Compete</div>
            </div>
            <div className="rounded p-4 text-center bg-white/10 order-4 sm:order-[2]">
              <div className="text-xl font-bold text-white">T3</div>
              <div className="text-white/70 text-sm">Growth</div>
            </div>
            <div className="rounded p-4 text-center bg-white/10 order-5 sm:order-[1]">
              <div className="text-xl font-bold text-white">T4</div>
              <div className="text-white/70 text-sm">Start</div>
            </div>
          </div>
          <div className="mt-3 text-center text-white/80">More Wins = Bigger Rewards and Opportunity.</div>
        </FadeInOnScroll>

        <PublicFooter />
      </div>
    </VideoBackground>
  )
}