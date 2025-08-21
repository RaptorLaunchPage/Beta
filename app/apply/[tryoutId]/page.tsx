"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { VideoBackground } from "@/components/video-background"
import { PublicNavigation } from "@/components/public/PublicNavigation"
import { PublicFooter } from "@/components/public/PublicFooter"
import { 
  UserPlus, 
  Clock, 
  Send,
  CheckCircle,
  AlertCircle,
  Home
} from "lucide-react"
import Link from "next/link"

const DISCORD_INVITE = process.env.NEXT_PUBLIC_DISCORD_INVITE || 'https://discord.com/invite/'

export default function TryoutApplicationPage() {
  const params = useParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  
  const [formData, setFormData] = useState({
    full_name: '',
    ign: '',
    discord_tag: '',
    contact_email: '',
    additional_notes: ''
  })

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.full_name || !formData.ign || !formData.contact_email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      setSubmitted(true)
      toast({
        title: "Application Submitted!",
        description: "Thank you for your interest. We'll review your application soon.",
      })
    } catch (error) {
      toast({
        title: "Submission Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <VideoBackground>
        <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto flex flex-col">
          <PublicNavigation />
          <div className="flex-1 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-black/60 backdrop-blur-md border border-white/20 shadow-xl">
              <CardContent className="flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-white">Loading tryout details...</p>
                </div>
              </CardContent>
            </Card>
          </div>
          <PublicFooter />
        </div>
      </VideoBackground>
    )
  }

  if (submitted) {
    return (
      <VideoBackground>
        <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto flex flex-col">
          <PublicNavigation />
          <div className="flex-1 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-black/60 backdrop-blur-md border border-white/20 shadow-xl">
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
                <h3 className="text-lg font-semibold mb-2 text-white">Application Submitted!</h3>
                <p className="text-white/80 mb-4">
                  Thank you for applying to Raptors Main - July 2025. We'll review your application and get back to you soon.
                </p>
                <p className="text-sm text-white/70">For updates and communication, please join our Discord.</p>
                <div className="mt-4">
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
          </div>
          <PublicFooter />
        </div>
      </VideoBackground>
    )
  }

  return (
    <VideoBackground>
      <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto flex flex-col">
        <PublicNavigation />
        
        <div className="flex-1 py-12">
          {/* Ambient glowing dots */}
          <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-6 w-6 rounded-full bg-white opacity-60 blur-2xl animate-pulse" />
          <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-3 w-3 rounded-full bg-white opacity-40 blur-md animate-pulse" />
          
          <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Header Card */}
            <Card className="mb-8 bg-black/60 backdrop-blur-md border border-white/20 shadow-xl">
              <CardHeader>
                <div className="flex items-start gap-4 relative">
                  <Link href="/" className="absolute right-0 top-0">
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                      <Home className="h-4 w-4 mr-2" />
                      Home
                    </Button>
                  </Link>
                  <div className="p-3 bg-white/10 rounded-lg">
                    <UserPlus className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 pr-20">
                    <CardTitle className="text-2xl mb-2 text-white">Raptors Main - July 2025</CardTitle>
                    <CardDescription className="text-base text-white/80">
                      Looking for skilled players to join our main roster for the upcoming season.
                    </CardDescription>
                    
                    <div className="mt-4 p-3 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                      <div className="flex items-center gap-2 text-yellow-300">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Application deadline: January 31, 2025
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Card className="bg-black/60 backdrop-blur-md border border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white">Personal Information</CardTitle>
                  <CardDescription className="text-white/70">Tell us about yourself</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name" className="text-white">Full Name *</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData(prev => ({...prev, full_name: e.target.value}))}
                        required
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ign" className="text-white">In-Game Name (IGN) *</Label>
                      <Input
                        id="ign"
                        value={formData.ign}
                        onChange={(e) => setFormData(prev => ({...prev, ign: e.target.value}))}
                        required
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="discord_tag" className="text-white">Discord Tag</Label>
                      <Input
                        id="discord_tag"
                        placeholder="username#1234"
                        value={formData.discord_tag}
                        onChange={(e) => setFormData(prev => ({...prev, discord_tag: e.target.value}))}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_email" className="text-white">Email Address *</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        value={formData.contact_email}
                        onChange={(e) => setFormData(prev => ({...prev, contact_email: e.target.value}))}
                        required
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/60 backdrop-blur-md border border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white">Additional Information</CardTitle>
                  <CardDescription className="text-white/70">Help us understand your experience</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="additional_notes" className="text-white">Tell us about yourself</Label>
                    <Textarea
                      id="additional_notes"
                      placeholder="Tell us about your experience, achievements, or anything else you'd like us to know..."
                      rows={4}
                      value={formData.additional_notes}
                      onChange={(e) => setFormData(prev => ({...prev, additional_notes: e.target.value}))}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/60 backdrop-blur-md border border-white/20 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex justify-center">
                    <Button 
                      type="submit" 
                      size="lg" 
                      disabled={submitting}
                      className="min-w-[200px] bg-white/10 hover:bg-white/20 text-white border border-white/20"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit Application
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </div>
          </div>
        </div>
        <PublicFooter />
      </div>
    </VideoBackground>
  )
}
