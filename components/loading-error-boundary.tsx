"use client"

import React from 'react'
// Removed AdvancedLoading import - using global loading system
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { VideoBackground } from '@/components/video-background'
import { RefreshCw, AlertTriangle, Home } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface LoadingErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface LoadingErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
}

export class LoadingErrorBoundary extends React.Component<
  LoadingErrorBoundaryProps,
  LoadingErrorBoundaryState
> {
  constructor(props: LoadingErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): LoadingErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Loading Error Boundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  handleRefresh = () => {
    // Clear any stored session data that might be causing issues
    if (typeof window !== 'undefined') {
      localStorage.removeItem('raptor-session')
      localStorage.removeItem('raptor-access-token')
      localStorage.removeItem('raptor-intended-route')
      
      // Force a full page reload
      window.location.reload()
    }
  }

  handleGoHome = () => {
    if (typeof window !== 'undefined') {
      router.push('/')
    }
  }

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props

      if (Fallback) {
        return <Fallback error={this.state.error!} resetError={this.resetError} />
      }

      return (
        <VideoBackground>
          <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-lg bg-black/90 backdrop-blur-xl border border-red-400/60 shadow-2xl">
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  {/* Error Icon */}
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500/20 to-pink-500/20 blur-xl opacity-30 animate-pulse" />
                    <div className="relative flex items-center justify-center w-20 h-20 mx-auto">
                      <AlertTriangle className="h-10 w-10 text-red-400" />
                    </div>
                  </div>

                  {/* Error Message */}
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                      Loading Error
                    </h2>
                    <p className="text-white/80 drop-shadow-md">
                      Something went wrong while loading the application
                    </p>
                    {this.state.error && (
                      <p className="text-sm text-red-300 bg-red-900/20 p-2 rounded border border-red-400/30">
                        {this.state.error.message}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      onClick={this.handleRefresh}
                      className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-500/50"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh App
                    </Button>
                    <Button
                      onClick={this.handleGoHome}
                      variant="outline"
                      className="border-white/40 text-white hover:bg-white/10"
                    >
                      <Home className="h-4 w-4 mr-2" />
                      Go Home
                    </Button>
                  </div>

                  {/* Debug Info (only in development) */}
                  {process.env.NODE_ENV === 'development' && this.state.error && (
                    <details className="text-left">
                      <summary className="text-sm text-white/60 cursor-pointer hover:text-white/80">
                        Debug Information
                      </summary>
                      <pre className="mt-2 text-xs text-white/70 bg-black/40 p-2 rounded border border-white/20 overflow-auto max-h-40">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </VideoBackground>
      )
    }

    return this.props.children
  }
}