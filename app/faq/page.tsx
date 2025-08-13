"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { VideoBackground } from "@/components/video-background"
import { PublicNavigation } from "@/components/public/PublicNavigation"
import { PublicFooter } from "@/components/public/PublicFooter"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Link2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import { getButtonStyle } from "@/lib/global-theme"
import Head from "next/head"

// Configurable: allow multiple FAQ items open at once
const ALLOW_MULTIPLE_OPEN = true

// Plain text QA for JSON-LD
const faqData = [
  {
    category: "General",
    items: [
      {
        id: "joining-fee",
        q: "Is there any joining fee to be part of Raptor Esports?",
        a: "No. Raptor Esports never charges a joining fee. Entry is completely free for teams that pass our selection process. All sponsored players also receive free access to our performance platform and tools."
      },
      {
        id: "invest-in-underdogs",
        q: "Why does Raptor Esports invest in underdog teams?",
        a: "We believe talent is everywhere — it just needs the right platform, structure, and opportunities to shine. By supporting ambitious but lesser-known teams, we create a healthy competitive scene and discover future champions."
      },
      {
        id: "how-to-join",
        q: "How do I join Raptor Esports?",
        a: "Fill out our recruitment form on the Join Us page. If your team meets our criteria, we’ll reach out to arrange trial matches and onboarding."
      },
      {
        id: "location-eligibility",
        q: "Is Raptor Esports open to players from any location?",
        a: "Yes, but all teams must be able to participate in our scheduled scrims, training sessions, and tournaments."
      },
      {
        id: "communications",
        q: "How does Raptor Esports communicate with players and fans?",
        a: "We operate primarily on Discord. It’s mandatory for all teams, players, and even fans who want updates to join our official Discord server for communication with staff and admins."
      },
    ],
  },
  {
    category: "Tiers & Incentives",
    items: [
      {
        id: "tier-system",
        q: "How does the tier system work?",
        a: (
          <p>
            Our structure ranges from Tier 4 (entry level) up to God Tier (top teams). Teams move up or down based on their win rate in scrims and events.
          </p>
        )
      },
      {
        id: "promotion-criteria",
        q: "How can my team get promoted?",
        a: (
          <p>
            Win more than 50% of your monthly slots/lobbies in your current tier, and you’ll move up to the next tier.
          </p>
        )
      },
      {
        id: "winrate-drop",
        q: "What happens if my win rate drops?",
        a: (
          <p>
            Teams with a win rate below 35% of their monthly slots/lobbies may be moved to a lower tier or removed from the system. Between 35%–50% means you stay in your current tier.
          </p>
        )
      },
      {
        id: "rewards-higher-tiers",
        q: "What are the rewards for higher tiers?",
        a: (
          <p>
            Higher tiers face stronger competition and unlock perks like wildcard tournament entries, performance gear, and other exclusive benefits.
          </p>
        )
      },
      {
        id: "prize-pool-sharing",
        q: "How does prize pool sharing work?",
        a: (
          <p>
            For eligible teams, winnings are shared between the team and the organization after covering basic participation costs. Major tournaments have their own sharing rules.
          </p>
        )
      },
    ],
  },
  {
    category: "Training & Performance Tools",
    items: [
      {
        id: "tools-provided",
        q: "What tools do Raptor Esports teams get?",
        a: (
          <p>
            Sponsored teams get free access to our internal performance platform, match analytics, and training attendance monitoring system.
          </p>
        )
      },
      {
        id: "ai-tools-public",
        q: "Are the AI and analytics tools available to the public?",
        a: (
          <p>
            No, these are for internal use by Raptor Esports players, coaches, and analysts only.
          </p>
        )
      },
      {
        id: "training-schedule",
        q: "How often are training sessions held?",
        a: (
          <p>
            Training and scrims are scheduled daily from 1 PM to 12 AM, with a break from 5 PM to 7 PM, except on holidays. These hours include training, scrims, meetings, and other team activities.
          </p>
        )
      },
    ],
  },
  {
    category: "Player Commitments",
    items: [
      {
        id: "naming-requirements",
        q: "Are there any naming requirements for selected players/teams?",
        a: (
          <p>
            Yes. Selected teams or players are required to change all in-game names (IGNs) to include our official Raptor Esports tag.
          </p>
        )
      },
      {
        id: "rename-card-costs",
        q: "Who is responsible for rename card costs?",
        a: (
          <p>
            Any costs related to in-game rename cards are the player’s or team’s responsibility.
          </p>
        )
      },
      {
        id: "attendance-policy",
        q: "Do players have to attend all scheduled sessions?",
        a: (
          <p>
            Yes. Commitment to the training and scrim schedule is mandatory unless prior approval is granted by the management team.
          </p>
        )
      },
    ],
  },
  {
    category: "Collaboration",
    items: [
      {
        id: "collaborations",
        q: "How can I collaborate with Raptor Esports?",
        a: (
          <p>
            Use the Contact Us page to send a brand or partnership inquiry.
          </p>
        )
      },
      {
        id: "content-creators",
        q: "Do you work with content creators or streamers?",
        a: (
          <p>
            Yes — if your content aligns with our brand and values, we’re open to collaboration.
          </p>
        )
      },
    ],
  },
  {
    category: "Future Plans",
    items: [
      {
        id: "future-roadmap",
        q: "What are Raptor Esports’ future plans?",
        a: (
          <div className="space-y-2">
            <p>
              We aim to become one of the most competitive and professionally structured esports organizations in our region. Our roadmap includes:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-white/85">
              <li>Expanding our competitive roster across multiple games.</li>
              <li>Introducing advanced training programs with AI and human coaching.</li>
              <li>Increasing national and international event participation.</li>
              <li>Enhancing infrastructure.</li>
              <li>Growing community engagement.</li>
              <li>Building strategic partnerships for sustainable growth.</li>
            </ul>
          </div>
        )
      },
    ],
  },
]

// Utility to ensure stable, human-friendly IDs
const faq = [
  {
    category: "General",
    items: [
      {
        id: "joining-fee",
        q: "Is there any joining fee to be part of Raptor Esports?",
        a: (
          <p>
            No. Raptor Esports never charges a joining fee. Entry is completely free for teams that pass our selection process.
            All sponsored players also receive free access to our performance platform and tools.
          </p>
        )
      },
      {
        id: "invest-in-underdogs",
        q: "Why does Raptor Esports invest in underdog teams?",
        a: (
          <p>
            We believe talent is everywhere — it just needs the right platform, structure, and opportunities to shine. By supporting ambitious but lesser-known teams, we create a healthy competitive scene and discover future champions.
          </p>
        )
      },
      {
        id: "how-to-join",
        q: "How do I join Raptor Esports?",
        a: (
          <p>
            Fill out our recruitment form on the Join Us page. If your team meets our criteria, we’ll reach out to arrange trial matches and onboarding.
          </p>
        )
      },
      {
        id: "location-eligibility",
        q: "Is Raptor Esports open to players from any location?",
        a: (
          <p>
            Yes, but all teams must be able to participate in our scheduled scrims, training sessions, and tournaments.
          </p>
        )
      },
      {
        id: "communications",
        q: "How does Raptor Esports communicate with players and fans?",
        a: (
          <p>
            We operate primarily on Discord. It’s mandatory for all teams, players, and even fans who want updates to join our official Discord server for communication with staff and admins.
          </p>
        )
      },
    ],
  },
  {
    category: "Tiers & Incentives",
    items: [
      {
        id: "tier-system",
        q: "How does the tier system work?",
        a: (
          <p>
            Our structure ranges from Tier 4 (entry level) up to God Tier (top teams). Teams move up or down based on their win rate in scrims and events.
          </p>
        )
      },
      {
        id: "promotion-criteria",
        q: "How can my team get promoted?",
        a: (
          <p>
            Win more than 50% of your monthly slots/lobbies in your current tier, and you’ll move up to the next tier.
          </p>
        )
      },
      {
        id: "winrate-drop",
        q: "What happens if my win rate drops?",
        a: (
          <p>
            Teams with a win rate below 35% of their monthly slots/lobbies may be moved to a lower tier or removed from the system. Between 35%–50% means you stay in your current tier.
          </p>
        )
      },
      {
        id: "rewards-higher-tiers",
        q: "What are the rewards for higher tiers?",
        a: (
          <p>
            Higher tiers face stronger competition and unlock perks like wildcard tournament entries, performance gear, and other exclusive benefits.
          </p>
        )
      },
      {
        id: "prize-pool-sharing",
        q: "How does prize pool sharing work?",
        a: (
          <p>
            For eligible teams, winnings are shared between the team and the organization after covering basic participation costs. Major tournaments have their own sharing rules.
          </p>
        )
      },
    ],
  },
  {
    category: "Training & Performance Tools",
    items: [
      {
        id: "tools-provided",
        q: "What tools do Raptor Esports teams get?",
        a: (
          <p>
            Sponsored teams get free access to our internal performance platform, match analytics, and training attendance monitoring system.
          </p>
        )
      },
      {
        id: "ai-tools-public",
        q: "Are the AI and analytics tools available to the public?",
        a: (
          <p>
            No, these are for internal use by Raptor Esports players, coaches, and analysts only.
          </p>
        )
      },
      {
        id: "training-schedule",
        q: "How often are training sessions held?",
        a: (
          <p>
            Training and scrims are scheduled daily from 1 PM to 12 AM, with a break from 5 PM to 7 PM, except on holidays. These hours include training, scrims, meetings, and other team activities.
          </p>
        )
      },
    ],
  },
  {
    category: "Player Commitments",
    items: [
      {
        id: "naming-requirements",
        q: "Are there any naming requirements for selected players/teams?",
        a: (
          <p>
            Yes. Selected teams or players are required to change all in-game names (IGNs) to include our official Raptor Esports tag.
          </p>
        )
      },
      {
        id: "rename-card-costs",
        q: "Who is responsible for rename card costs?",
        a: (
          <p>
            Any costs related to in-game rename cards are the player’s or team’s responsibility.
          </p>
        )
      },
      {
        id: "attendance-policy",
        q: "Do players have to attend all scheduled sessions?",
        a: (
          <p>
            Yes. Commitment to the training and scrim schedule is mandatory unless prior approval is granted by the management team.
          </p>
        )
      },
    ],
  },
  {
    category: "Collaboration",
    items: [
      {
        id: "collaborations",
        q: "How can I collaborate with Raptor Esports?",
        a: (
          <p>
            Use the Contact Us page to send a brand or partnership inquiry.
          </p>
        )
      },
      {
        id: "content-creators",
        q: "Do you work with content creators or streamers?",
        a: (
          <p>
            Yes — if your content aligns with our brand and values, we’re open to collaboration.
          </p>
        )
      },
    ],
  },
  {
    category: "Future Plans",
    items: [
      {
        id: "future-roadmap",
        q: "What are Raptor Esports’ future plans?",
        a: (
          <div className="space-y-2">
            <p>
              We aim to become one of the most competitive and professionally structured esports organizations in our region. Our roadmap includes:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-white/85">
              <li>Expanding our competitive roster across multiple games.</li>
              <li>Introducing advanced training programs with AI and human coaching.</li>
              <li>Increasing national and international event participation.</li>
              <li>Enhancing infrastructure.</li>
              <li>Growing community engagement.</li>
              <li>Building strategic partnerships for sustainable growth.</li>
            </ul>
          </div>
        )
      },
    ],
  },
]

export default function FAQPage() {
  const { toast } = useToast()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://raptor-esports.example'
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqData.flatMap(section => section.items.map(item => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.a
      }
    })))
  }

  // Track open items (single vs multiple)
  const [openValues, setOpenValues] = useState<string[]>([])
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  // Map of item id -> element ref for scroll
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const allIds = useMemo(() => faq.flatMap(cat => cat.items.map(i => i.id)), [])

  const isOpen = useCallback((id: string) => openValues.includes(id), [openValues])

  const setRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    itemRefs.current[id] = el
  }, [])

  const expandAndScrollTo = useCallback((id: string) => {
    if (!allIds.includes(id)) return

    setOpenValues(prev => {
      if (ALLOW_MULTIPLE_OPEN) {
        return Array.from(new Set([id, ...prev]))
      }
        return [id]
    })

    // Delay to allow expansion animation, then smooth scroll
    setTimeout(() => {
      const el = itemRefs.current[id]
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        setHighlightedId(id)
        // Clear highlight after ~2.5s
        setTimeout(() => setHighlightedId(curr => (curr === id ? null : curr)), 2600)
      }
    }, 60)
  }, [allIds])

  // Handle hash on load and on changes
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace(/^#/, "")
      if (hash) expandAndScrollTo(hash)
    }
    handleHash()
    window.addEventListener("hashchange", handleHash)
    return () => window.removeEventListener("hashchange", handleHash)
  }, [expandAndScrollTo])

  const handleCopyLink = useCallback((id: string) => {
    const url = `${window.location.origin}/faq#${id}`
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Link copied", description: "A sharable link is in your clipboard." })
      // Update hash without scrolling
      history.replaceState(null, "", `#${id}`)
    }).catch(() => {
      toast({ title: "Copy failed", description: "Please try again." })
    })
  }, [toast])

  return (
    <VideoBackground>
      <Head>
        <title>FAQ | Raptor Esports</title>
        <meta name="description" content="Everything about tiers, incentives, commitments, and more." />
        <meta name="keywords" content="Raptor Esports, FAQ, tiers, incentives, training, players" />
        <link rel="canonical" href={`${siteUrl}/faq`} />
        <meta property="og:title" content="FAQ | Raptor Esports" />
        <meta property="og:description" content="Everything about tiers, incentives, commitments, and more." />
        <meta property="og:image" content={`${siteUrl}/og-image.jpg`} />
        <meta property="og:url" content={`${siteUrl}/faq`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="FAQ | Raptor Esports" />
        <meta name="twitter:description" content="Everything about tiers, incentives, commitments, and more." />
        <meta name="twitter:image" content={`${siteUrl}/og-image.jpg`} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      </Head>
      <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto flex flex-col">
        <PublicNavigation />

        {/* Hero */}
        <section className="relative h-[38vh] sm:h-[46vh] w-full pt-14">
          <div className="absolute inset-0" aria-hidden>
            <div className="h-full w-full bg-[url('/images/faq-hero.jpg')] bg-cover bg-center blur-[2px] brightness-[.65]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          </div>
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white drop-shadow-xl">Frequently Asked Questions</h1>
            <p className="mt-3 max-w-2xl text-white/80">Everything about tiers, incentives, commitments, and more.</p>
          </div>
        </section>

        {/* Content */}
        <main className="flex-1">
          <section className="max-w-6xl mx-auto px-4 py-10">
            <div className="grid grid-cols-1 gap-6">
              {/* FAQ Accordions */}
              <div className="space-y-8">
                {faq.map(section => (
                  <div key={section.category}>
                    <h2 className="text-2xl font-bold text-white mb-3">{section.category}</h2>
                    <Accordion
                      type={ALLOW_MULTIPLE_OPEN ? "multiple" : "single"}
                      value={openValues}
                      onValueChange={(val) => {
                        const next = Array.isArray(val) ? val : (val ? [val] : [])
                        setOpenValues(next)
                      }}
                      collapsible
                      className="rounded-md bg-white/5 backdrop-blur-md border border-white/10"
                    >
                      {section.items.map((item) => (
                        <AccordionItem key={item.id} value={item.id} className="px-4" asChild>
                          <div ref={setRef(item.id)} id={item.id} className="scroll-mt-24">
                            {/* Highlight ring on hash navigation */}
                            <motion.div
                              animate={highlightedId === item.id ? { boxShadow: [
                                "0 0 0 0 rgba(59,130,246,0.0)",
                                "0 0 0 6px rgba(59,130,246,0.35)",
                                "0 0 0 0 rgba(59,130,246,0.0)"
                              ] } : { boxShadow: "0 0 0 0 rgba(0,0,0,0)" }}
                              transition={{ duration: 2.4, ease: "easeInOut" }}
                              className="rounded-md"
                            >
                              <AccordionTrigger className="text-white/90">
                                <div className="flex items-center gap-2">
                                  <span className="text-left">
                                    {item.q}
                                  </span>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          aria-label="Copy link"
                                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopyLink(item.id) }}
                                          className="ml-2 inline-flex items-center justify-center rounded p-1 text-white/70 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/15"
                                        >
                                          <Link2 className="h-4 w-4" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Copy link
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="text-white/80">
                                {item.a}
                              </AccordionContent>
                            </motion.div>
                          </div>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                ))}
              </div>
              {/* Need more help - moved to bottom */}
              <Card>
                <CardHeader>
                  <CardTitle>Need more help?</CardTitle>
                </CardHeader>
                <CardContent className="text-white/80 space-y-3">
                  <p>If you can’t find what you’re looking for, our team is here to help.</p>
                  <div className="flex gap-3">
                    <a href="/contact" className={`px-4 py-2 rounded-md text-sm font-semibold ${getButtonStyle('primary')}`}>Contact Us</a>
                    <a href="/join-us" className={`px-4 py-2 rounded-md text-sm font-semibold ${getButtonStyle('outline')}`}>Apply</a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>

        <PublicFooter />
      </div>
    </VideoBackground>
  )
}

/*
Deep linking implementation notes:
- Every question has a stable `id` used as the DOM id and Accordion value.
- On load and on `hashchange`, we parse `window.location.hash`, expand the matching item, smooth-scroll to it, and apply a brief glow using framer-motion boxShadow animation for ~2.4s.
- Each question header includes a small "copy link" button that copies `/faq#<id>` to clipboard and shows a toast.
- Set `ALLOW_MULTIPLE_OPEN` to true/false to allow multiple items open or only a single open at a time.
*/