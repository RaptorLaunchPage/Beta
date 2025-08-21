"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  AlertTriangle, 
  RefreshCw, 
  Bug, 
  Home,
  ChevronDown,
  ChevronRight,
  Copy
} from 'lucide-react'
import { GLOBAL_THEME } from '@/lib/global-theme'
import { useRouter } from 'next/navigation'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  showError?: boolean
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  showDetails: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Report error to monitoring service (if configured)
    if (process.env.NODE_ENV === 'production') {
      // You can integrate with error monitoring services here
      // e.g., Sentry, LogRocket, etc.
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    })
  }

  private handleGoHome = () => {
    const router = useRouter()
    router.push('/dashboard')
  }

  private handleCopyError = async () => {
    const errorText = `
Error: ${this.state.error?.message}
Stack: ${this.state.error?.stack}
Component Stack: ${this.state.errorInfo?.componentStack}
`
    await navigator.clipboard.writeText(errorText)
  }

  private toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }))
  }

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      const isDevelopment = process.env.NODE_ENV === 'development'

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
          <Card className={GLOBAL_THEME.cards.error}>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-red-500/20 rounded-full">
                  <AlertTriangle className="h-12 w-12 text-red-400" />
                </div>
              </div>
              <CardTitle className="text-2xl text-white mb-2">
                Something went wrong
              </CardTitle>
              <p className="text-white/80">
                An unexpected error occurred while rendering this component.
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Error Summary */}
              <div className={`${GLOBAL_THEME.glassmorphic.subtle} p-4 rounded-lg`}>
                <div className="flex items-center gap-2 mb-2">
                  <Bug className="h-4 w-4 text-red-400" />
                  <span className="font-medium text-white">Error Details</span>
                </div>
                <p className="text-sm text-red-200 font-mono">
                  {this.state.error?.message || 'Unknown error occurred'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={this.handleRetry}
                  className={GLOBAL_THEME.buttons.primary}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                
                <Button 
                  onClick={this.handleGoHome}
                  variant="outline"
                  className={GLOBAL_THEME.buttons.outline}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>

              {/* Developer Details */}
              {(isDevelopment || this.props.showError) && (
                <div className="space-y-3">
                  <Button
                    onClick={this.toggleDetails}
                    variant="ghost"
                    size="sm"
                    className="w-full text-white/70 hover:text-white"
                  >
                    {this.state.showDetails ? (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    )}
                    Technical Details
                  </Button>

                  {this.state.showDetails && (
                    <div className={`${GLOBAL_THEME.glassmorphic.subtle} p-4 rounded-lg space-y-4`}>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-red-200 border-red-400/50">
                          Development Mode
                        </Badge>
                        <Button
                          onClick={this.handleCopyError}
                          size="sm"
                          variant="ghost"
                          className="text-white/70 hover:text-white"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Error
                        </Button>
                      </div>

                      {/* Error Stack */}
                      <div>
                        <h4 className="text-sm font-medium text-white mb-2">Error Stack:</h4>
                        <div className="bg-black/40 p-3 rounded text-xs font-mono text-red-200 overflow-auto max-h-32">
                          {this.state.error?.stack}
                        </div>
                      </div>

                      {/* Component Stack */}
                      {this.state.errorInfo?.componentStack && (
                        <div>
                          <h4 className="text-sm font-medium text-white mb-2">Component Stack:</h4>
                          <div className="bg-black/40 p-3 rounded text-xs font-mono text-orange-200 overflow-auto max-h-32">
                            {this.state.errorInfo.componentStack}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Help Text */}
              <div className="text-center text-sm text-white/60">
                <p>
                  If this error persists, please contact the development team with the error details above.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook-based wrapper for functional components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Higher-order component for class components
export function errorBoundary<P extends object>(
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  return function(Component: React.ComponentType<P>) {
    return withErrorBoundary(Component, errorBoundaryProps)
  }
}

export default ErrorBoundary