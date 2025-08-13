"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { supabase } from "@/lib/supabase"
import { useSafeRedirect } from '@/lib/client-utils'
import { PublicNavigation } from "@/components/public/PublicNavigation"
import { PublicFooter } from "@/components/public/PublicFooter"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CheckCircle, User, Mail, GamepadIcon, ArrowRight, ArrowLeft } from "lucide-react"
import { usePageLoading } from "@/lib/global-loading-manager"
import { VideoBackground } from "@/components/video-background"
import { getButtonStyle } from "@/lib/global-theme"

interface OnboardingForm {
  fullName: string
  displayName: string
  contactNumber: string
  experience: string
  preferredRole: string
  favoriteGames: string
  bio: string
}

export default function OnboardingPage() {
  const { profile, isLoading: authLoading, refreshProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { safeRedirect } = useSafeRedirect()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<OnboardingForm>({
    fullName: "",
    displayName: "",
    contactNumber: "",
    experience: "",
    preferredRole: "",
    favoriteGames: "",
    bio: ""
  })
  
  // Add refs to prevent multiple redirects
  const mounted = useRef(true)

  useEffect(() => {
    // Redirect if user is already onboarded or not authenticated
    if (!authLoading && profile) {
      if (profile.role !== "pending_player") {
        console.log('🔄 User already onboarded, redirecting to dashboard')
        safeRedirect("/dashboard")
      }
    } else if (!authLoading && !profile) {
      console.log('🔄 No profile found, redirecting to homepage')
      safeRedirect("/")
    }
  }, [profile, authLoading, safeRedirect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mounted.current = false
    }
  }, [])

  const { startPageLoad, completePageLoad } = usePageLoading()
  
  useEffect(() => {
    if (authLoading || !profile) {
      startPageLoad('onboarding')
    } else {
      completePageLoad('onboarding')
    }
  }, [authLoading, profile, startPageLoad, completePageLoad])

  // Show loading while checking auth
  if (authLoading || !profile) {
    return null // Global loading will handle this
  }

  const handleInputChange = (field: keyof OnboardingForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleNext = () => {
    if (step === 1) {
      if (!formData.fullName.trim() || !formData.displayName.trim() || !formData.contactNumber.trim()) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields before continuing.",
          variant: "destructive"
        })
        return
      }
    }
    setStep(prev => Math.min(prev + 1, 3))
  }

  const handlePrevious = () => {
    setStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!formData.experience.trim() || !formData.preferredRole.trim()) {
      toast({
        title: "Missing Information",
        description: "Please complete all required fields.",
        variant: "destructive"
      })
      return
    }

    // Prevent multiple submissions
    if (loading) {
      return
    }

    setLoading(true)

    try {
      // Update the user in the database
      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.fullName,
          display_name: formData.displayName,
          contact_number: formData.contactNumber,
          experience: formData.experience,
          preferred_role: formData.preferredRole,
          favorite_games: formData.favoriteGames,
          bio: formData.bio,
          onboarding_completed: true,
          auto_sync_tryout_data: true, // Enable auto-sync by default
          last_profile_update: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (error) {
        console.error('Profile update error:', error)
        throw error
      }

      toast({
        title: "Profile Complete!",
        description: "Your profile has been submitted. An admin will review and approve your account. You'll be notified when your account is activated.",
      })

      // Refresh the auth state to pick up the profile changes
      await refreshProfile()

      // Redirect to dashboard after a brief delay
      setTimeout(() => {
        if (mounted.current) {
          safeRedirect('/dashboard', { delay: 1000 })
        }
      }, 1000) // Increased delay to ensure state updates are complete

    } catch (error: any) {
      console.error('Onboarding error:', error)
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to complete setup. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <GamepadIcon className="mx-auto h-16 w-16 text-white mb-4 opacity-80" />
              <h2 className="esports-heading text-2xl text-white mb-2">Personal Information</h2>
              <p className="text-slate-200">Let's get to know you better</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName" className="text-white font-medium">Full Name *</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-white/40"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="displayName" className="text-white font-medium">Display Name *</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-white/40"
                  placeholder="How should we display your name?"
                  required
                />
              </div>

              <div>
                <Label htmlFor="contactNumber" className="text-white font-medium">Contact Number *</Label>
                <Input
                  id="contactNumber"
                  type="tel"
                  value={formData.contactNumber}
                  onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-white/40"
                  placeholder="+91 XXXXX XXXXX"
                  required
                />
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <User className="mx-auto h-16 w-16 text-white mb-4 opacity-80" />
              <h2 className="esports-heading text-2xl text-white mb-2">Gaming Profile</h2>
              <p className="text-slate-200">Tell us about your gaming experience</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="experience" className="text-white font-medium">Gaming Experience *</Label>
                <Input
                  id="experience"
                  type="text"
                  value={formData.experience}
                  onChange={(e) => handleInputChange('experience', e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-white/40"
                  placeholder="e.g., 2 years competitive BGMI"
                  required
                />
              </div>

              <div>
                <Label htmlFor="preferredRole" className="text-white font-medium">Preferred Role *</Label>
                <Input
                  id="preferredRole"
                  type="text"
                  value={formData.preferredRole}
                  onChange={(e) => handleInputChange('preferredRole', e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-white/40"
                  placeholder="e.g., IGL, Fragger, Support"
                  required
                />
              </div>

              <div>
                <Label htmlFor="favoriteGames" className="text-white font-medium">Favorite Games</Label>
                <Input
                  id="favoriteGames"
                  type="text"
                  value={formData.favoriteGames}
                  onChange={(e) => handleInputChange('favoriteGames', e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-white/40"
                  placeholder="e.g., BGMI, Valorant, CS2"
                />
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <CheckCircle className="mx-auto h-16 w-16 text-white mb-4 opacity-80" />
              <h2 className="esports-heading text-2xl text-white mb-2">Final Touches</h2>
              <p className="text-slate-200">Add a personal bio to complete your profile</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="bio" className="text-white font-medium">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-white/40 min-h-[120px]"
                  placeholder="Tell us about yourself, your goals, and what makes you unique as a player..."
                />
              </div>

              <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-100">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  You're almost ready! Once you complete your profile, you'll have full access to the Raptor Esports Hub dashboard.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <VideoBackground>
      <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto flex flex-col">
        <PublicNavigation />
        
        <div className="flex-1 flex items-center justify-center p-4">
          {/* Subtle white glowing dots */}
          <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-8 w-8 rounded-full bg-white opacity-60 blur-2xl animate-pulse" />
          <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-4 w-4 rounded-full bg-white opacity-40 blur-md animate-pulse" />
          
          <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="esports-heading text-4xl font-bold text-white mb-4">Complete Your Setup</h1>
            <p className="text-xl text-slate-200">
              Welcome to Raptor Esports Hub! Let's set up your player profile.
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      step >= stepNumber 
                        ? 'bg-white text-black' 
                        : 'bg-white/20 text-white border border-white/40'
                    }`}
                  >
                    {stepNumber}
                  </div>
                  {stepNumber < 3 && (
                    <div 
                      className={`w-12 h-0.5 mx-2 ${
                        step > stepNumber ? 'bg-white' : 'bg-white/20'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main card */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl">
            <CardContent className="p-8">
              {renderStep()}
              
              {/* Navigation buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t border-white/20">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={step === 1}
                  className={`${getButtonStyle('outline')} disabled:opacity-50`}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>

                {step < 3 ? (
                  <Button
                    onClick={handleNext}
                    className={`${getButtonStyle('primary')}`}
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className={`${getButtonStyle('primary')}`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Completing Setup...
                      </>
                    ) : (
                      <>
                        Complete Setup
                        <CheckCircle className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
        <PublicFooter />
      </div>
    </VideoBackground>
  )
}