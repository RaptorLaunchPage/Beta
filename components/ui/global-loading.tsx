"use client"

import React, { memo } from 'react'
import { VideoBackground } from "@/components/video-background"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Wifi, 
  Shield, 
  CheckCircle, 
  User, 
  Settings, 
  Globe, 
  Database, 
  AlertCircle,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useGlobalLoading, LoadingState } from "@/lib/global-loading-manager"

interface LoadingStepConfig {
  icon: React.ComponentType<any>
  title: string
  description: string
  color: string
  bgColor: string
}

const LOADING_STEPS: Record<LoadingState, LoadingStepConfig> = {
  idle: {
    icon: Loader2,
    title: "Ready",
    description: "System ready",
    color: "text-gray-400",
    bgColor: "from-gray-500/20 to-slate-500/20"
  },
  connecting: {
    icon: Wifi,
    title: "Establishing Connection",
    description: "Connecting to Raptor servers...",
    color: "text-blue-400",
    bgColor: "from-blue-500/20 to-cyan-500/20"
  },
  authenticating: {
    icon: Shield,
    title: "Verifying Identity",
    description: "Authenticating your credentials...",
    color: "text-green-400", 
    bgColor: "from-green-500/20 to-emerald-500/20"
  },
  'checking-agreement': {
    icon: CheckCircle,
    title: "Checking Agreements",
    description: "Reviewing user agreement status...",
    color: "text-amber-400",
    bgColor: "from-amber-500/20 to-yellow-500/20"
  },
  'loading-profile': {
    icon: User,
    title: "Loading Profile",
    description: "Retrieving your player data...",
    color: "text-purple-400",
    bgColor: "from-purple-500/20 to-violet-500/20"
  },
  initializing: {
    icon: Settings,
    title: "Initializing Dashboard",
    description: "Setting up your esports hub...",
    color: "text-cyan-400",
    bgColor: "from-cyan-500/20 to-blue-500/20"
  },
  redirecting: {
    icon: Globe,
    title: "Almost Ready",
    description: "Taking you to your dashboard...",
    color: "text-indigo-400",
    bgColor: "from-indigo-500/20 to-purple-500/20"
  },
  processing: {
    icon: Database,
    title: "Processing",
    description: "Processing your request...",
    color: "text-orange-400",
    bgColor: "from-orange-500/20 to-red-500/20"
  },
  error: {
    icon: AlertCircle,
    title: "Connection Issue",
    description: "Please refresh the page if this persists...",
    color: "text-red-400",
    bgColor: "from-red-500/20 to-pink-500/20"
  }
}

interface GlobalLoadingProps {
  customTitle?: string
  customDescription?: string
  showProgress?: boolean
  className?: string
}

const GlobalLoading = memo(function GlobalLoading({ 
  customTitle,
  customDescription,
  showProgress = true,
  className
}: GlobalLoadingProps) {
  const { isLoading, currentState, message, progress } = useGlobalLoading()

  // Don't render if not loading
  if (!isLoading) {
    return null
  }

  const stepConfig = LOADING_STEPS[currentState] || LOADING_STEPS.processing
  const Icon = stepConfig.icon

  const displayTitle = customTitle || stepConfig.title
  const displayDescription = customDescription || message || stepConfig.description

  return (
    <VideoBackground>
      <div className={cn("min-h-screen flex items-center justify-center p-4", className)}>
        <Card className="w-full max-w-lg bg-black/90 backdrop-blur-xl border border-white/20 shadow-2xl">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              {/* Loading Icon */}
              <div className="relative">
                <div className={cn(
                  "absolute inset-0 rounded-full bg-gradient-to-r blur-xl opacity-30 animate-pulse",
                  stepConfig.bgColor
                )} />
                <div className="relative flex items-center justify-center w-20 h-20 mx-auto">
                  <Icon className={cn("h-10 w-10 animate-spin", stepConfig.color)} />
                </div>
              </div>

              {/* Loading Text */}
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                  {displayTitle}
                </h2>
                <p className="text-white/80 drop-shadow-md">
                  {displayDescription}
                </p>
              </div>

              {/* Progress Bar */}
              {showProgress && progress !== undefined && (
                <div className="w-full bg-white/20 rounded-full h-2 sm:h-3 overflow-hidden">
                  <div 
                    className={cn(
                      "h-full bg-gradient-to-r transition-all duration-300 ease-out",
                      stepConfig.bgColor.replace('/20', '/60')
                    )}
                    style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                  />
                </div>
              )}

              {/* Animated Dots */}
              <div className="flex justify-center space-x-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-2 h-2 rounded-full animate-pulse",
                      stepConfig.color.replace('text-', 'bg-')
                    )}
                    style={{
                      animationDelay: `${i * 0.2}s`,
                      animationDuration: '1s'
                    }}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </VideoBackground>
  )
})

export default GlobalLoading