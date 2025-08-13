"use client"

import { useEffect, useRef, useState } from 'react'
import { useSession } from '@/hooks/use-session'
import SessionStorage from '@/lib/session-storage'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock } from 'lucide-react'

interface IdleTimerProps {
  onLogout: () => void
}

export function IdleTimer({ onLogout }: IdleTimerProps) {
  const { isAuthenticated, updateLastActive } = useSession()
  const { toast } = useToast()
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(30)
  
  const idleTimerRef = useRef<NodeJS.Timeout>()
  const warningTimerRef = useRef<NodeJS.Timeout>()
  const countdownIntervalRef = useRef<NodeJS.Timeout>()
  
  const config = SessionStorage.getConfig()

  // Reset idle timer
  const resetIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }
    
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current)
    }

    if (!isAuthenticated) return

    // Update last active
    updateLastActive()

    // Set timer for inactivity warning
    const warningTime = config.INACTIVITY_TIMEOUT - config.WARNING_BEFORE_LOGOUT
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true)
      setCountdown(30)
      startCountdown()
    }, warningTime)

    // Set timer for auto logout
    idleTimerRef.current = setTimeout(() => {
      handleAutoLogout()
    }, config.INACTIVITY_TIMEOUT)
  }

  // Start countdown for warning dialog
  const startCountdown = () => {
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          handleAutoLogout()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Handle auto logout
  const handleAutoLogout = () => {
    clearAllTimers()
    setShowWarning(false)
    
    toast({
      title: "Session Expired",
      description: "You've been logged out due to inactivity",
      variant: "destructive"
    })
    
    onLogout()
  }

  // Handle stay logged in
  const handleStayLoggedIn = () => {
    clearAllTimers()
    setShowWarning(false)
    resetIdleTimer()
    
    toast({
      title: "Session Extended",
      description: "Your session has been extended"
    })
  }

  // Clear all timers
  const clearAllTimers = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
  }

  // Activity event handlers
  const handleActivity = () => {
    if (showWarning) return // Don't reset if warning is shown
    resetIdleTimer()
  }

  // Set up activity listeners
  useEffect(() => {
    if (!isAuthenticated) {
      clearAllTimers()
      return
    }

    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ]

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    // Initialize timer
    resetIdleTimer()

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
      clearAllTimers()
    }
  }, [isAuthenticated])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers()
    }
  }, [])

  if (!isAuthenticated) return null

  return (
    <Dialog open={showWarning} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Session Timeout Warning
          </DialogTitle>
          <DialogDescription>
            Your session will expire due to inactivity. You will be automatically logged out in:
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center justify-center py-6">
          <div className="flex items-center gap-3 text-2xl font-bold text-destructive">
            <Clock className="h-6 w-6" />
            <span>{countdown} seconds</span>
          </div>
        </div>
        
        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleAutoLogout}
            className="flex-1"
          >
            Logout Now
          </Button>
          <Button
            onClick={handleStayLoggedIn}
            className="flex-1"
          >
            Stay Logged In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
