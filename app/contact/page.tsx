"use client"

import React, { useState } from 'react'
import { VideoBackground } from '@/components/video-background'
import { PublicNavigation } from '@/components/public/PublicNavigation'
import { PublicFooter } from '@/components/public/PublicFooter'
import { FadeInOnScroll } from '@/components/ui/fade-in-on-scroll'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2, Upload, Loader2, X } from "lucide-react"

const collabTypes = [
  { value: 'sponsorship', label: 'Sponsorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'endorsement', label: 'Endorsement' },
  { value: 'other', label: 'Other' }
]

const DISCORD_INVITE = process.env.NEXT_PUBLIC_DISCORD_INVITE || 'https://discord.com/invite/'

export default function ContactPage() {
  const { toast } = useToast()
  const [mode, setMode] = useState<'general' | 'brand'>('general')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{
    url: string
    name: string
    size: number
  } | null>(null)

  const [general, setGeneral] = useState({
    name: '',
    subject: '',
    message: ''
  })

  const [brand, setBrand] = useState({
    brandName: '',
    contactName: '',
    website: '',
    collabType: '',
    details: '',
    file: null as File | null
  })

  const handleFileUpload = async (file: File) => {
    if (!file) return

    // Validate file type
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp"]
    if (!allowed.includes(file.type)) {
      toast({ title: "Invalid file", description: "Upload a PDF or image (PNG/JPG/WEBP).", variant: "destructive" })
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max size is 10MB.", variant: "destructive" })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/public/upload/contact-file', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setUploadedFile({
        url: data.downloadUrl,
        name: data.fileName,
        size: data.fileSize
      })

      toast({
        title: "File uploaded",
        description: `${file.name} uploaded successfully`,
        variant: "default"
      })

    } catch (error: any) {
      console.error('File upload error:', error)
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setBrand(prev => ({ ...prev, file }))
      handleFileUpload(file)
    }
  }

  const removeFile = () => {
    setUploadedFile(null)
    setBrand(prev => ({ ...prev, file: null }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (mode === "general") {
      if (!general.name || !general.subject || !general.message) {
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
        // Include file info if uploaded
        ...(uploadedFile && {
          fileUrl: uploadedFile.url,
          fileName: uploadedFile.name
        })
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
    } catch (err: any) {
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
              <p className="mt-3 max-w-2xl text-white/85">Whether you're a fan, player, or brand — let's connect.</p>
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
                  <p className="text-white/80 mt-2">We'll get back to you soon.</p>
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
                    {/* Mode Toggle */}
                    <div className="flex gap-2 p-1 bg-white/10 rounded-lg">
                      <Button
                        type="button"
                        variant={mode === "general" ? "default" : "ghost"}
                        onClick={() => setMode("general")}
                        className="flex-1"
                      >
                        General Inquiry
                      </Button>
                      <Button
                        type="button"
                        variant={mode === "brand" ? "default" : "ghost"}
                        onClick={() => setMode("brand")}
                        className="flex-1"
                      >
                        Brand / Collaboration
                      </Button>
                    </div>

                    {/* General Inquiry */}
                    <div className={`transition-all duration-300 ${mode === "general" ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none absolute h-0 overflow-hidden"}`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm text-white/90">Name *</label>
                          <Input
                            value={general.name}
                            onChange={(e) => setGeneral((p) => ({ ...p, name: e.target.value }))}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            required={mode === "general"}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-white/90">Subject *</label>
                          <Input
                            value={general.subject}
                            onChange={(e) => setGeneral((p) => ({ ...p, subject: e.target.value }))}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            required={mode === "general"}
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

                      <div className="space-y-2 mt-4">
                        <label className="text-sm text-white/90">Media Deck (PDF or image, max 10MB)</label>
                        
                        {/* File Upload Area */}
                        <div className="space-y-3">
                          {!uploadedFile ? (
                            <div className="flex items-center gap-3">
                              <input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={handleFileChange}
                                className="text-white/80"
                                disabled={uploading}
                              />
                              {uploading ? (
                                <Loader2 className="h-4 w-4 text-white/70 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4 text-white/70" />
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg border border-white/20">
                              <div className="flex items-center gap-3">
                                <Upload className="h-4 w-4 text-white/70" />
                                <div>
                                  <p className="text-sm text-white/90">{uploadedFile.name}</p>
                                  <p className="text-xs text-white/60">
                                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={removeFile}
                                className="text-white/70 hover:text-white"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button disabled={submitting || uploading} type="submit" className="px-5 py-2 font-semibold">
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