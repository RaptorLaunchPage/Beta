"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"
import { VideoBackground } from "@/components/video-background"
import { PublicNavigation } from "@/components/public/PublicNavigation"
import { PublicFooter } from "@/components/public/PublicFooter"
import { FadeInOnScroll } from "@/components/ui/fade-in-on-scroll"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { getButtonStyle } from "@/lib/global-theme"
import { useToast } from "@/hooks/use-toast"
// Public submission endpoint, no auth required

import { Bolt, Send, Link2 } from "lucide-react"

const DISCORD_INVITE = process.env.NEXT_PUBLIC_DISCORD_INVITE || 'https://discord.com/invite/'

export default function JoinUsPage() {
  const { toast } = useToast()
  // No webhook selection; handled by public API + env vars

  const scrollToForm = () => {
    const el = document.getElementById("application-form")
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  // Player/Team application state
  const [isTeam, setIsTeam] = useState<"individual" | "team">("individual")
  const [playerForm, setPlayerForm] = useState({
    name: "",
    ign: "",
    email: "",
    phone: "",
    applicantType: "individual" as "individual" | "team",
    games: [] as string[],
    otherGame: "",
    tier: "",
    results: "",
    acceptedPolicy: false,
  })

  const [submitted, setSubmitted] = useState(false)

  const availableGames = useMemo(
    () => ["BGMI", "Valorant", "CS2", "Dota 2", "COD Mobile", "PUBG PC", "Apex Legends", "Other"],
    []
  )

  const tiers = ["Tier 4", "Tier 3", "Tier 2", "Tier 1", "God Tier"]

  const toggleGame = (game: string) => {
    setPlayerForm((prev) => {
      const has = prev.games.includes(game)
      return { ...prev, games: has ? prev.games.filter((g) => g !== game) : [...prev.games, game] }
    })
  }

  const handlePlayerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!playerForm.name || !playerForm.ign || !playerForm.email || !playerForm.acceptedPolicy) {
      toast({ title: "Missing information", description: "Please complete all required fields and accept the policy.", variant: "destructive" })
      return
    }

    try {
      const payload = {
        name: playerForm.name,
        ign: playerForm.ign,
        email: playerForm.email,
        phone: playerForm.phone,
        applicantType: playerForm.applicantType,
        games: playerForm.games,
        otherGame: playerForm.otherGame,
        tier: playerForm.tier,
        results: playerForm.results,
      }
      const res = await fetch('/api/public/submit/application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || 'Failed to submit')
      }
      setSubmitted(true)
      toast({ title: "Application submitted", description: "Join our Discord for updates and communication." })
    } catch (err:any) {
      toast({ title: 'Submission failed', description: err.message || 'Please try again later', variant: 'destructive' })
    }
  }

  // Brand/Collab state
  const [brandForm, setBrandForm] = useState({
    name: "",
    email: "",
    phone: "",
    type: "",
    message: "",
  })

  const handleBrandSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!brandForm.name || !brandForm.email || !brandForm.type) {
      toast({ title: "Missing information", description: "Please fill in required fields.", variant: "destructive" })
      return
    }
    try {
      const payload = { ...brandForm }
      const res = await fetch('/api/public/submit/application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || 'Failed to submit')
      }
      setSubmitted(true)
      toast({ title: "Inquiry sent", description: "Join our Discord for updates and communication." })
    } catch (err:any) {
      toast({ title: 'Submission failed', description: err.message || 'Please try again later', variant: 'destructive' })
    }
  }

  return (
    <VideoBackground>
      <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto">
        <PublicNavigation />

        {/* Hero Section */}
        <section className="relative h-[48vh] sm:h-[56vh] w-full pt-14">
          <div className="absolute inset-0">
            <div className="h-full w-full bg-gradient-to-b from-black/70 via-black/40 to-transparent" />
          </div>
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
            <FadeInOnScroll>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white drop-shadow-xl">Join Raptor Esports</h1>
            </FadeInOnScroll>
            <FadeInOnScroll delayMs={120}>
              <p className="mt-3 max-w-3xl text-white/85">Your path to the next level starts here.</p>
            </FadeInOnScroll>
            <FadeInOnScroll delayMs={180}>
              <p className="mt-3 max-w-3xl text-white/80">
                Whether you’re an aspiring player, a full squad ready to compete, or a brand looking to collaborate — this is your
                gateway to becoming part of Raptor Esports. We review every application carefully to ensure the best fit for our
                competitive ecosystem.
              </p>
            </FadeInOnScroll>
            <FadeInOnScroll delayMs={260}>
              <button onClick={scrollToForm} className={`mt-8 px-6 py-2 rounded-md font-semibold ${getButtonStyle("primary")}`}>
                Apply Now
              </button>
            </FadeInOnScroll>
          </div>
        </section>

        {/* Form or Thank You Section */}
        <section id="application-form" className="max-w-6xl mx-auto px-4 py-10">
          <FadeInOnScroll>
            <Card className="bg-black/60 backdrop-blur-md border-white/20 text-white">
              {submitted ? (
                <CardContent className="p-8 text-center">
                  <div className="text-2xl font-semibold">Thank you for your application!</div>
                  <p className="text-white/80 mt-2">We’ll review your submission shortly.</p>
                  <p className="text-white/80 mt-6">Join our Discord for updates and any further communication.</p>
                  <div className="mt-3">
                    <a
                      href={DISCORD_INVITE}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-5 py-2 rounded-md font-semibold bg-[#5865F2] hover:bg-[#4752C4] text-white"
                    >
                      Join our Discord
                    </a>
                  </div>
                </CardContent>
              ) : (
                <CardContent>
                  <form onSubmit={handlePlayerSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FadeInOnScroll className="space-y-2">
                          <label className="text-sm text-white/90">Name *</label>
                          <Input
                            value={playerForm.name}
                            onChange={(e) => setPlayerForm((p) => ({ ...p, name: e.target.value }))}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            placeholder="Your full name"
                            required
                          />
                        </FadeInOnScroll>
                        <FadeInOnScroll className="space-y-2" delayMs={80}>
                          <label className="text-sm text-white/90">In-game Name *</label>
                          <Input
                            value={playerForm.ign}
                            onChange={(e) => setPlayerForm((p) => ({ ...p, ign: e.target.value }))}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            placeholder="Your IGN"
                            required
                          />
                        </FadeInOnScroll>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FadeInOnScroll className="space-y-2">
                          <label className="text-sm text-white/90">Email *</label>
                          <Input
                            type="email"
                            value={playerForm.email}
                            onChange={(e) => setPlayerForm((p) => ({ ...p, email: e.target.value }))}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            placeholder="name@example.com"
                            required
                          />
                        </FadeInOnScroll>
                        <FadeInOnScroll className="space-y-2" delayMs={80}>
                          <label className="text-sm text-white/90">Phone</label>
                          <Input
                            type="tel"
                            value={playerForm.phone}
                            onChange={(e) => setPlayerForm((p) => ({ ...p, phone: e.target.value }))}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            placeholder="Optional"
                          />
                        </FadeInOnScroll>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FadeInOnScroll className="space-y-2">
                          <label className="text-sm text-white/90">Individual or Team? *</label>
                          <Select
                            value={playerForm.applicantType}
                            onValueChange={(v: "individual" | "team") => {
                              setPlayerForm((p) => ({ ...p, applicantType: v }))
                              setIsTeam(v)
                            }}
                          >
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="individual">Individual</SelectItem>
                              <SelectItem value="team">Team</SelectItem>
                            </SelectContent>
                          </Select>
                        </FadeInOnScroll>
                        <FadeInOnScroll className="space-y-2" delayMs={80}>
                          <label className="text-sm text-white/90">Current competitive tier</label>
                          <Select
                            value={playerForm.tier}
                            onValueChange={(v) => setPlayerForm((p) => ({ ...p, tier: v }))}
                          >
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue placeholder="Select tier" />
                            </SelectTrigger>
                            <SelectContent>
                              {tiers.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FadeInOnScroll>
                      </div>

                      <FadeInOnScroll className="space-y-3">
                        <div className="text-sm text-white/90">Game(s) played</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {availableGames.map((g) => (
                            <label key={g} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-md px-3 py-2 hover:bg-white/10 transition-colors">
                              <Checkbox
                                checked={playerForm.games.includes(g)}
                                onCheckedChange={() => toggleGame(g)}
                                className="data-[state=checked]:bg-blue-600 border-white/40"
                              />
                              <span className="text-sm text-white/90">{g}</span>
                            </label>
                          ))}
                        </div>
                        {playerForm.games.includes("Other") && (
                          <div className="space-y-2">
                            <label className="text-sm text-white/90">Other game</label>
                            <Input
                              value={playerForm.otherGame}
                              onChange={(e) => setPlayerForm((p) => ({ ...p, otherGame: e.target.value }))}
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                              placeholder="Please specify"
                            />
                          </div>
                        )}
                      </FadeInOnScroll>

                      <FadeInOnScroll className="space-y-2">
                        <label className="text-sm text-white/90">Past tournament results (optional)</label>
                        <Textarea
                          value={playerForm.results}
                          onChange={(e) => setPlayerForm((p) => ({ ...p, results: e.target.value }))}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                          placeholder="Brief highlights, notable placements, recent scrim performance, etc."
                          rows={4}
                        />
                      </FadeInOnScroll>

                      {/* Notes inside application, before submission */}
                      <FadeInOnScroll>
                        <div className="flex items-start gap-3 rounded-lg p-4 bg-blue-500/15 border border-blue-400/40 text-white">
                          <Bolt className="h-5 w-5 text-blue-300 mt-0.5" />
                          <div>
                            <div className="font-semibold">Recruitment Criteria</div>
                            <ul className="mt-1 text-white/85 text-sm list-disc list-inside space-y-1">
                              <li>Players/teams must meet minimum performance requirements.</li>
                              <li>All applicants will be evaluated based on skill, commitment, and fit with our community.</li>
                              <li>Applications are typically reviewed within 7 days.</li>
                            </ul>
                          </div>
                        </div>
                      </FadeInOnScroll>

                      <FadeInOnScroll className="flex items-start gap-3">
                        <Checkbox
                          checked={playerForm.acceptedPolicy}
                          onCheckedChange={(v) => setPlayerForm((p) => ({ ...p, acceptedPolicy: Boolean(v) }))}
                          className="mt-1 data-[state=checked]:bg-blue-600 border-white/40"
                        />
                        <span className="text-sm text-white/80">
                          I have read and understood the <Link href="/incentives" className="underline">incentive</Link> and
                          <Link href="/tier-structure" className="underline ml-1">tier</Link> system before applying.
                        </span>
                      </FadeInOnScroll>

                      <FadeInOnScroll>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                          <Button type="submit" className="px-5 py-2 font-semibold">
                            Submit Application
                            <Send className="h-4 w-4 ml-2" />
                          </Button>
                          <Link href="/tier-structure" className={`inline-flex items-center gap-2 px-5 py-2 rounded-md font-semibold ${getButtonStyle("secondary")}`}>
                            View Tier Structure
                          </Link>
                          <Link href="/incentives" className={`inline-flex items-center gap-2 px-5 py-2 rounded-md font-semibold ${getButtonStyle("secondary")}`}>
                            View Rewards
                          </Link>
                        </div>
                      </FadeInOnScroll>
                    </form>
                </CardContent>
              )}
            </Card>
          </FadeInOnScroll>
        </section>


        <PublicFooter />
      </div>
    </VideoBackground>
  )
}