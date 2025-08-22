"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { forceLogout } from "@/lib/force-logout"
import { PublicNavigation } from "@/components/public/PublicNavigation"
import { PublicFooter } from "@/components/public/PublicFooter"
import { 
  FileText, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  ScrollText,
  Shield
} from "lucide-react"
import ReactMarkdown from 'react-markdown'
import { VideoBackground } from "@/components/video-background"
import { usePageLoading } from "@/lib/global-loading-manager"
import { getButtonStyle } from "@/lib/global-theme"

interface AgreementContent {
  role: string
  current_version: number
  title: string
  last_updated: string
  content: string
}

export default function AgreementReviewPage() {
  const { user, profile, isLoading: authLoading, getToken, acceptAgreement, agreementStatus } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  const [agreementContent, setAgreementContent] = useState<AgreementContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const [hasRedirected, setHasRedirected] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // Load agreement content
  useEffect(() => {
    const loadAgreementContent = async () => {
      if (!user || !profile?.role) return

      try {
        const token = await getToken()
        if (!token) throw new Error('No auth token')

        const response = await fetch(`/api/agreements/content?role=${profile.role}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to load agreement: ${response.statusText}`)
        }

        const data = await response.json()
        setAgreementContent(data.agreement)
      } catch (error) {
        console.error('Failed to load agreement content:', error)
        toast({
          title: "Error",
          description: "Failed to load agreement content. Please try again.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    if (user && profile?.role) {
      loadAgreementContent()
    }
  }, [user, profile?.role, toast])

  // Handle scroll to track if user has read to the bottom
  useEffect(() => {
    const handleScroll = () => {
      const element = contentRef.current
      if (!element) return

      const threshold = 100 // increased threshold for better detection
      const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + threshold
      
      if (isAtBottom && !hasScrolledToBottom) {
        console.log('User scrolled to bottom, enabling accept button')
        setHasScrolledToBottom(true)
      }
    }

    const element = contentRef.current
    if (element) {
      element.addEventListener('scroll', handleScroll)
      // Check initial state - if content is short enough, auto-enable
      const isShortContent = element.scrollHeight <= element.clientHeight + 50
      if (isShortContent) {
        console.log('Content is short, auto-enabling accept button')
        setHasScrolledToBottom(true)
      } else {
        handleScroll()
      }
      
      return () => element.removeEventListener('scroll', handleScroll)
    }
  }, [hasScrolledToBottom, agreementContent])

  const handleAccept = async () => {
    if (submitting || hasRedirected) return
    
    setSubmitting(true)
    try {
      const success = await acceptAgreement()
      if (success) {
        setHasRedirected(true)
        toast({ title: "Agreement Accepted", description: "Redirecting to Dashboard…" })
        setTimeout(() => {
          router.replace('/dashboard')
        }, 1000)
      } else {
        throw new Error('Failed to accept agreement')
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to accept agreement. Please try again.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDecline = async () => {
    setSubmitting(true)
    
    toast({
      title: "Agreement Declined",
      description: "Clearing session and logging out...",
      variant: "destructive"
    })
    
    try {
      // Try to record the decline (but don't wait for it)
      // Decline handling will be implemented if needed
    } catch (e) {
      console.log('Decline API call failed:', e)
    }
    
    // Force logout immediately regardless of API success/failure
    setTimeout(() => {
      forceLogout()
    }, 1500)
    
    setSubmitting(false)
  }

  // Emergency bypass for admins
  const handleEmergencyBypass = () => {
    if (profile?.role === 'admin') {
      toast({
        title: "Admin Bypass",
        description: "Using emergency admin bypass. Redirecting to dashboard...",
      })
      router.push('/dashboard')
    }
  }

  // Redirect if no agreement needed
  useEffect(() => {
    if (hasRedirected) return
    
    if (!authLoading && agreementStatus && !agreementStatus.requiresAgreement) {
      setHasRedirected(true)
      setTimeout(() => router.replace('/dashboard'), 500)
    }
  }, [authLoading, agreementStatus, router, hasRedirected])

  const { startPageLoad, completePageLoad } = usePageLoading()
  
  useEffect(() => {
    if (authLoading || loading) {
      startPageLoad('agreement-review')
    } else {
      completePageLoad('agreement-review')
    }
  }, [authLoading, loading, startPageLoad, completePageLoad])

  if (authLoading || loading) {
    return null // Global loading will handle this
  }

  if (!user || !profile) {
    router.push('/')
    return null
  }

  if (!agreementContent) {
    return (
      <VideoBackground>
        <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto flex flex-col">
          <PublicNavigation />
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-6 w-6 rounded-full bg-white opacity-60 blur-2xl animate-pulse" />
            <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-3 w-3 rounded-full bg-white opacity-40 blur-md animate-pulse" />
            
            <Card className="w-full max-w-md bg-white/10 backdrop-blur-md border-white/20 shadow-xl">
              <CardContent className="flex items-center justify-center p-8">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-white">Agreement Not Found</h3>
                  <p className="text-white/80">
                    Could not load the agreement for your role. Please contact support.
                  </p>
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
        
        <div className="flex-1 py-8">
          <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-6 w-6 rounded-full bg-white opacity-60 blur-2xl animate-pulse" />
          <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-3 w-3 rounded-full bg-white opacity-40 blur-md animate-pulse" />
          
          <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <Card className="mb-6 bg-white/10 backdrop-blur-md border-white/20 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl text-white">Agreement Review Required</CardTitle>
                <CardDescription className="text-white/80">
                  Please review and accept the {agreementContent.title} to continue.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Agreement Status Alert */}
        {agreementStatus && (
          <Alert className="mb-6 bg-amber-500/20 border-amber-500/30 text-amber-100">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {agreementStatus.status === 'missing' && 'You need to accept the agreement to access the system.'}
              {agreementStatus.status === 'outdated' && `Your agreement version (${agreementStatus.current_version}) is outdated. Please review the latest version (${agreementStatus.required_version}).`}
              {agreementStatus.status === 'declined' && 'You previously declined this agreement. Please review and accept to continue.'}
              {agreementStatus.status === 'pending' && 'Your agreement acceptance is pending. Please complete the process.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Agreement Content */}
        <Card className="mb-6 bg-white/10 backdrop-blur-md border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <FileText className="h-5 w-5" />
              {agreementContent.title}
            </CardTitle>
            <CardDescription className="text-white/80">
              {agreementContent.last_updated} • Version {agreementContent.current_version}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              ref={contentRef}
              className="max-h-96 overflow-y-auto border border-white/30 rounded-lg p-4 bg-white/5 backdrop-blur-sm"
            >
              <div className="prose prose-sm max-w-none text-white">
                <ReactMarkdown 
                  components={{
                    h1: ({ children }) => <h1 className="text-white text-xl font-bold mb-4">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-white text-lg font-semibold mb-3">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-white text-md font-medium mb-2">{children}</h3>,
                    p: ({ children }) => <p className="text-white/90 mb-3">{children}</p>,
                    ul: ({ children }) => <ul className="text-white/90 mb-3 list-disc list-inside">{children}</ul>,
                    ol: ({ children }) => <ol className="text-white/90 mb-3 list-decimal list-inside">{children}</ol>,
                    li: ({ children }) => <li className="text-white/90 mb-1">{children}</li>,
                  }}
                >
                  {agreementContent.content}
                </ReactMarkdown>
              </div>
            </div>
            
            {!hasScrolledToBottom && (
              <div className="mt-4 p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-100">
                    <ScrollText className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Please scroll to the bottom to read the complete agreement.
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      console.log('Manual override: enabling accept button')
                      setHasScrolledToBottom(true)
                    }}
                    className={`text-xs ${getButtonStyle('ghost')}`}
                  >
                    I've read it
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={handleDecline}
                variant="outline"
                size="lg"
                disabled={submitting}
                className={`min-w-[150px] ${getButtonStyle('outline')} bg-red-500/20 border-red-500/40 text-red-100 hover:bg-red-500/30 hover:border-red-500/60`}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Decline
              </Button>
              
              <Button
                onClick={() => {
                  console.log('Accept button clicked', { hasScrolledToBottom, submitting })
                  handleAccept()
                }}
                size="lg"
                disabled={!hasScrolledToBottom || submitting}
                className={`min-w-[150px] ${getButtonStyle('primary')}`}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept Agreement
                    {!hasScrolledToBottom && <span className="ml-1 text-xs">(Scroll Down)</span>}
                  </>
                )}
              </Button>
            </div>
            
            {!hasScrolledToBottom && (
              <p className="text-center text-sm text-white/70 mt-4">
                You must read the complete agreement before accepting.
              </p>
            )}

            {/* Emergency Admin Bypass */}
            {profile?.role === 'admin' && (
              <div className="mt-6 pt-4 border-t border-white/20">
                <div className="text-center">
                  <p className="text-sm text-white/70 mb-2">
                    Admin Emergency Access
                  </p>
                  <Button
                    onClick={handleEmergencyBypass}
                    variant="ghost"
                    size="sm"
                    className={`${getButtonStyle('ghost')} text-orange-300 hover:text-orange-100 hover:bg-orange-500/20`}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Emergency Bypass
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
          </div>
        </div>
        <PublicFooter />
      </div>
    </VideoBackground>
  )
}
