"use client"

import { useEffect } from "react"
import { VideoBackground } from "@/components/video-background"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skull, RefreshCw, Home, AlertCircle } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Critical global error:', error)
  }, [error])

  return (
    <html>
      <body>
        <VideoBackground>
          {/* Ambient glowing dots */}
          <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-6 w-6 rounded-full bg-red-500 opacity-60 blur-2xl animate-pulse" />
          <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-3 w-3 rounded-full bg-red-500 opacity-40 blur-md animate-pulse" />
          <div className="pointer-events-none fixed left-3/4 top-1/2 z-10 h-4 w-4 rounded-full bg-red-500 opacity-30 blur-lg animate-pulse" />
          
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="text-center max-w-2xl w-full">
              {/* Critical Error Hero */}
              <Card className="bg-white/10 backdrop-blur-md border-red-500/30 shadow-xl mb-8">
                <CardHeader className="pb-4">
                  <div className="mx-auto mb-4">
                    <div className="relative">
                      <Skull className="h-24 w-24 text-red-500 mx-auto animate-pulse" />
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                        <AlertCircle className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </div>
                  <CardTitle className="text-4xl font-bold text-white mb-2">
                    Critical System Failure
                  </CardTitle>
                  <CardDescription className="text-red-200 text-lg">
                    The Raptor Hub has encountered a fatal error
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-red-600/30 border border-red-500/50 rounded-lg p-4 backdrop-blur-sm">
                    <p className="text-red-100 font-mono text-sm">
                      CRITICAL ERROR: {error.message || 'System failure detected'}
                    </p>
                    {error.digest && (
                      <p className="text-red-200/70 text-xs mt-2">
                        Error Trace: {error.digest}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-white/80 leading-relaxed space-y-3">
                    <p>
                      A critical error has occurred that prevented the application from functioning properly. 
                      This is a serious system-level issue that requires immediate attention.
                    </p>
                    <p className="text-red-200 font-medium">
                      ⚠️ Please try reloading the page or contact technical support if this persists.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <Button 
                  onClick={reset}
                  size="lg"
                  className="bg-red-600 hover:bg-red-700 text-white font-medium"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Emergency Reset
                </Button>
                
                <Button 
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  size="lg"
                  className="border-red-500/40 text-red-200 hover:bg-red-500/20 font-medium"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Force Home
                </Button>
              </div>

              {/* Critical Help */}
              <Card className="bg-red-500/10 backdrop-blur-md border-red-500/20">
                <CardContent className="p-6">
                  <h3 className="text-red-200 font-semibold mb-3">🚨 Critical Error Protocol</h3>
                  <div className="text-red-200/80 text-sm space-y-2">
                    <p>• This is a system-level error that affects core functionality</p>
                    <p>• Try clearing all browser data and cookies</p>
                    <p>• Disable browser extensions temporarily</p>
                    <p>• Contact support immediately if error persists</p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-red-500/20">
                    <p className="text-red-300/60 text-xs">
                      Critical error logged at {new Date().toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </VideoBackground>
      </body>
    </html>
  )
}
