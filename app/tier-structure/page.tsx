"use client"

import React from "react"
import { VideoBackground } from "@/components/video-background"
import { PublicNavigation } from "@/components/public/PublicNavigation"
import { PublicFooter } from "@/components/public/PublicFooter"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FadeInOnScroll } from "@/components/ui/fade-in-on-scroll"
import { getButtonStyle } from "@/lib/global-theme"
import Link from "next/link"
import { CheckCircle2, Trophy, ArrowRight, Star, Award, Shield, Target } from "lucide-react"

export default function TierStructurePage() {
  return (
    <VideoBackground>
      <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto">
        <PublicNavigation />

        {/* SECTION 1 — Hero / Header */}
        <section className="relative h-[45vh] sm:h-[52vh] w-full pt-14">
          <div className="absolute inset-0">
            <div className="h-full w-full bg-gradient-to-b from-black/70 via-black/40 to-transparent" />
          </div>
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
            <FadeInOnScroll>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white drop-shadow-xl">Rise Through Raptor Esports</h1>
            </FadeInOnScroll>
            <FadeInOnScroll delayMs={120}>
              <p className="mt-3 max-w-3xl text-white/80">
                From fresh challengers to elite champions — our tier system rewards skill, dedication, and consistency.
              </p>
            </FadeInOnScroll>
          </div>
        </section>

        {/* SECTION 2 — Tier Levels */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <FadeInOnScroll>
            <h2 className="text-3xl font-bold text-white mb-6">Tier Levels</h2>
          </FadeInOnScroll>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {[
              {
                name: "God Tier",
                desc: "The elite few at the very top. Dominates the competition and enjoys the highest perks & rewards.",
                bg: "bg-gradient-to-br from-black/80 to-black/95 border-white/30",
                Icon: Trophy,
              },
              {
                name: "Tier 1",
                desc: "Top-performing teams who consistently prove themselves against strong competition.",
                bg: "bg-gradient-to-br from-black/75 to-black/90 border-white/25",
                Icon: Star,
              },
              {
                name: "Tier 2",
                desc: "Skilled and competitive teams working towards breaking into the top ranks.",
                bg: "bg-gradient-to-br from-black/70 to-black/85 border-white/20",
                Icon: Award,
              },
              {
                name: "Tier 3",
                desc: "Solid, reliable teams honing their skills in balanced matchups.",
                bg: "bg-gradient-to-br from-black/65 to-black/80 border-white/15",
                Icon: Shield,
              },
              {
                name: "Tier 4",
                desc: "The entry tier for new challengers, with opportunities to quickly climb.",
                bg: "bg-gradient-to-br from-black/60 to-black/75 border-white/10",
                Icon: Target,
              },
            ].map((tier, idx) => (
              <FadeInOnScroll key={tier.name} delayMs={idx * 80}>
                <Card className={`${tier.bg} backdrop-blur-md text-white border shadow-xl hover:shadow-2xl transition-transform duration-200 hover:scale-[1.02]`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <tier.Icon className="h-5 w-5 text-white/90" />
                      <CardTitle className="text-lg font-semibold">{tier.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="text-white/80">
                    <p className="text-sm leading-relaxed">{tier.desc}</p>
                  </CardContent>
                </Card>
              </FadeInOnScroll>
            ))}
          </div>
        </section>

        {/* SECTION 3 — How Promotion Works */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <FadeInOnScroll>
            <h2 className="text-3xl font-bold text-white mb-6">How Promotion Works</h2>
          </FadeInOnScroll>

          <ul className="space-y-3 text-white/90">
            {[
              "Win over 50% of your monthly slots → Promotion to a higher tier.",
              "Maintain 35–50% win rate → Stay in your current tier.",
              "Below 35% → Move down to a lower tier or exit the system.",
              "New teams get a 2-week trial period with the same targets before full inclusion and sponsorship eligibility.",
            ].map((item, idx) => (
              <FadeInOnScroll key={idx} delayMs={idx * 80}>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-blue-300 shrink-0" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              </FadeInOnScroll>
            ))}
          </ul>
        </section>

        {/* SECTION 4 — Performance & Rewards */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <FadeInOnScroll>
            <h2 className="text-3xl font-bold text-white mb-6">Performance & Rewards</h2>
          </FadeInOnScroll>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              {
                title: "Higher Tiers, Bigger Stakes",
                body: "Higher tiers face tougher competition and gain access to greater rewards.",
              },
              {
                title: "Rewards & Perks",
                body: "Incentives include performance perks like wildcard entries, gear, and other benefits.",
              },
              {
                title: "Shared Winnings",
                body: "Teams exceeding 50% win rate can also earn shared winnings in addition to promotions.",
              },
            ].map((card, idx) => (
              <FadeInOnScroll key={card.title} delayMs={idx * 80}>
                <Card className="bg-black/60 backdrop-blur-md border-white/20 text-white shadow-xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold">{card.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-white/80">
                    <p className="text-sm leading-relaxed">{card.body}</p>
                  </CardContent>
                </Card>
              </FadeInOnScroll>
            ))}
          </div>
        </section>

        {/* SECTION 5 — Why It’s Gamified */}
        <section className="w-full">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <FadeInOnScroll>
              <h2 className="text-3xl font-bold text-white mb-4">Why It’s Gamified</h2>
            </FadeInOnScroll>
            <FadeInOnScroll delayMs={120}>
              <p className="text-white/85 leading-relaxed max-w-4xl">
                We believe competition should be fun, fair, and motivating. Our tier structure creates a clear path for growth, pushing teams to level up while rewarding dedication at every step.
              </p>
            </FadeInOnScroll>
          </div>
        </section>

        {/* SECTION 6 — Call to Action */}
        <section className="w-full">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className={`rounded-xl p-8 sm:p-10 text-center`}>
              <FadeInOnScroll>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">Think your team has what it takes? Join Raptor Esports today.</h3>
              </FadeInOnScroll>
              <FadeInOnScroll delayMs={120}>
                <Link href="/join-us" className={`inline-flex items-center gap-2 px-5 py-2 rounded-md font-semibold ${getButtonStyle('primary')}`}>
                  Apply Now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </FadeInOnScroll>
            </div>
          </div>
        </section>

        <PublicFooter />
      </div>
    </VideoBackground>
  )
}