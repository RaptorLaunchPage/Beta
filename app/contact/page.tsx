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
import { Button } from "@/components/ui/button"
import { getButtonStyle } from "@/lib/global-theme"
import { useToast } from "@/hooks/use-toast"
import { Upload, CheckCircle2 } from "lucide-react"
// Public submission endpoint, no auth required

export default function ContactPage() {
  const { toast } = useToast()

  const [mode, setMode] = useState<"general" | "brand">("general")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [selectedWebhookId] = useState<string | undefined>(undefined)

  // General inquiry state
  const [general, setGeneral] = useState({
    name: "",
    subject: "",
    message: "",
  })

  // Brand / Collaboration state
  const [brand, setBrand] = useState({
    brandName: "",
    contactName: "",
    website: "",
    collabType: "",
    details: "",
    file: null as File | null,
  })

  const collabTypes = [
    { value: "sponsorship", label: "Sponsorship" },
    { value: "tournament", label: "Tournament Partnership" },
    { value: "content", label: "Content Creation" },
    { value: "other", label: "Other" },
  ]

  // No webhook selection; handled by public API + env vars

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Basic validation
    if (mode === "general") {
      if (!general.name || !general.message) {
        toast({ title: "Validation error", description: "Please fill the required fields.", variant: "destructive" })
        return
      }
    } else {
      if (!brand.brandName || !brand.contactName || !brand.details) {
        toast({ title: "Validation error", description: "Please fill the required fields.", variant: "destructive" })
        return
      }
      if (brand.website && !/^https?:\/\//i.test(brand.website)) {
        toast({ title: "Invalid URL", description: "Please provide a valid website URL (https://...)", variant: "destructive" })
        return
      }
      if (brand.file) {
        const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp"]
        if (!allowed.includes(brand.file.type)) {
          toast({ title: "Invalid file", description: "Upload a PDF or image (PNG/JPG/WEBP).", variant: "destructive" })
          return
        }
        if (brand.file.size > 10 * 1024 * 1024) {
          toast({ title: "File too large", description: "Max size is 10MB.", variant: "destructive" })
          return
        }
      }
    }

    setSubmitting(true)
    try {
      const payload = mode === 'general' ? {
        topic: 'General Inquiry',
        name: general.name,
        subject: general.subject,
        message: general.message,
      } : {
        topic: 'Brand / Collaboration',
        brandName: brand.brandName,
        contactName: brand.contactName,
        website: brand.website,
        collabType: brand.collabType,
        message: brand.details,
      }
      const res = await fetch('/api/public/submit/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || 'Failed to submit')
      }
      setSubmitted(true)
    } catch (err:any) {
      toast({ title: 'Submission failed', description: err.message || 'Please try again later', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }

    // Smooth scroll to confirmation
    requestAnimationFrame(() => {
      const confirm = document.getElementById("contact-confirm")
      if (confirm) confirm.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  return (
    <VideoBackground>
      <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto">
        <PublicNavigation />

        {/* Title / Intro */}
        <section className="relative h-[40vh] sm:h-[46vh] w-full pt-14">
          <div className="absolute inset-0">
            <div className="h-full w-full bg-gradient-to-b from-black/70 via-black/40 to-transparent" />
          </div>
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
            <FadeInOnScroll>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white drop-shadow-xl">Contact Raptor Esports</h1>
            </FadeInOnScroll>
            <FadeInOnScroll delayMs={120}>
              <p className="mt-3 max-w-2xl text-white/85">Whether you’re a fan, player, or brand — let’s connect.</p>
            </FadeInOnScroll>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 py-10">
          {submitted ? (
            <FadeInOnScroll id="contact-confirm">
              <Card className="bg-black/60 backdrop-blur-md border-white/20 text-white">
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-3" />
                  <div className="text-2xl font-semibold">Thank you for reaching out!</div>
                  <p className="text-white/80 mt-2">We’ll get back to you soon.</p>
                </CardContent>
              </Card>
            </FadeInOnScroll>
          ) : (
            <FadeInOnScroll>
              <Card className="bg-black/60 backdrop-blur-md border-white/20 text-white">
                <CardHeader>
                  <CardTitle className="text-2xl">Send us a message</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm text-white/90">Topic *</label>
                        <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Select topic" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General Inquiry</SelectItem>
                            <SelectItem value="brand">Brand / Collaboration Inquiry</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Webhook selection removed from public UI; uses admin-configured webhook automatically */}
                    </div>

                    {/* General Inquiry */}
                    <div className={`transition-all duration-300 ${mode === "general" ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none absolute h-0 overflow-hidden"}`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm text-white/90">Full Name *</label>
                          <Input
                            value={general.name}
                            onChange={(e) => setGeneral((p) => ({ ...p, name: e.target.value }))}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            placeholder="Your name"
                            required={mode === "general"}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-white/90">Subject</label>
                          <Input
                            value={general.subject}
                            onChange={(e) => setGeneral((p) => ({ ...p, subject: e.target.value }))}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            placeholder="Short subject"
                          />
                        </div>
                      </div>
                      <div className="space-y-2 mt-4">
                        <label className="text-sm text-white/90">Message *</label>
                        <Textarea
                          value={general.message}
                          onChange={(e) => setGeneral((p) => ({ ...p, message: e.target.value }))}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                          rows={6}
                          required={mode === "general"}
                        />
                      </div>
                    </div>

                    {/* Brand / Collaboration */}
                    <div className={`transition-all duration-300 ${mode === "brand" ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none absolute h-0 overflow-hidden"}`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm text-white/90">Brand Name *</label>
                          <Input
                            value={brand.brandName}
                            onChange={(e) => setBrand((p) => ({ ...p, brandName: e.target.value }))}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            required={mode === "brand"}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-white/90">Contact Person Name *</label>
                          <Input
                            value={brand.contactName}
                            onChange={(e) => setBrand((p) => ({ ...p, contactName: e.target.value }))}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            required={mode === "brand"}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                          <label className="text-sm text-white/90">Brand Website (optional)</label>
                          <Input
                            value={brand.website}
                            onChange={(e) => setBrand((p) => ({ ...p, website: e.target.value }))}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            placeholder="https://example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-white/90">Type of Collaboration</label>
                          <Select value={brand.collabType} onValueChange={(v) => setBrand((p) => ({ ...p, collabType: v }))}>
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {collabTypes.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2 mt-4">
                        <label className="text-sm text-white/90">Proposal Details *</label>
                        <Textarea
                          value={brand.details}
                          onChange={(e) => setBrand((p) => ({ ...p, details: e.target.value }))}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                          rows={6}
                          required={mode === "brand"}
                        />
                      </div>

                      <div className="space-y-2 mt-2">
                        <label className="text-sm text-white/90">Media Deck (PDF or image, max 10MB)</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            onChange={(e) => setBrand((p) => ({ ...p, file: e.target.files?.[0] || null }))}
                            className="text-white/80"
                          />
                          <Upload className="h-4 w-4 text-white/70" />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button disabled={submitting} type="submit" className="px-5 py-2 font-semibold">
                        {submitting ? "Submitting..." : "Submit"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </FadeInOnScroll>
          )}
        </section>

        <PublicFooter />
      </div>
    </VideoBackground>
  )
}