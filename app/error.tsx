"use client"

import { useEffect } from "react"
import { VideoBackground } from "@/components/video-background"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PublicNavigation } from "@/components/public/PublicNavigation"
import { PublicFooter } from "@/components/public/PublicFooter"
import { getButtonStyle } from "@/lib/global-theme"
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react"
import Link from "next/link"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error)
  }, [error])

  return (
    <VideoBackground>
      <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto flex flex-col">
        <PublicNavigation />
        
        <div className="flex-1 flex items-center justify-center p-4">
          {/* Ambient glowing dots */}
          <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-6 w-6 rounded-full bg-white opacity-60 blur-2xl animate-pulse" />
          <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-3 w-3 rounded-full bg-white opacity-40 blur-md animate-pulse" />
          <div className="pointer-events-none fixed left-3/4 top-1/2 z-10 h-4 w-4 rounded-full bg-white opacity-30 blur-lg animate-pulse" />
          
          <div className="text-center max-w-2xl w-full">
          {/* Error Hero */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl mb-8">
            <CardHeader className="pb-4">
              <div className="mx-auto mb-4">
                <div className="relative">
                  <AlertTriangle className="h-20 w-20 text-red-400 mx-auto" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <Bug className="h-3 w-3 text-white" />
                  </div>
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-white mb-2">
                System Error
              </CardTitle>
              <CardDescription className="text-white/80 text-lg">
                Something went wrong in the Raptor Hub
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-red-100 font-mono text-sm">
                  {error.message || 'An unexpected error occurred'}
                </p>
                {error.digest && (
                  <p className="text-red-200/70 text-xs mt-2">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
              
              <p className="text-white/80 leading-relaxed">
                Our esports platform encountered an unexpected issue. This could be a temporary glitch 
                or a system malfunction. Please try the actions below to get back in the game.
              </p>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <Button 
              onClick={reset}
              size="lg"
              className={`${getButtonStyle('primary')}`}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <Link href="/">
              <Button 
                variant="outline"
                size="lg"
                className={`w-full ${getButtonStyle('outline')}`}
              >
                <Home className="w-4 h-4 mr-2" />
                Return Home
              </Button>
            </Link>
          </div>

          {/* Additional Help */}
          <Card className="bg-white/5 backdrop-blur-md border-white/10">
            <CardContent className="p-6">
              <h3 className="text-white font-semibold mb-3">Need Help?</h3>
              <div className="text-white/70 text-sm space-y-2">
                <p>• Try refreshing the page or clearing your browser cache</p>
                <p>• Check your internet connection</p>
                <p>• If the problem persists, contact our support team</p>
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-white/50 text-xs">
                  Error occurred at {new Date().toLocaleString()}
                </p>
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
