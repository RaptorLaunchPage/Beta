"use client"

import { useRouter } from 'next/navigation'
import { useRef } from 'react'

// Utility to prevent redirect loops
export function useSafeRedirect() {
  const router = useRouter()
  const redirectInProgress = useRef(false)
  const redirectCount = useRef(0)
  const lastRedirectTime = useRef(0)

  const safeRedirect = (path: string, options?: { 
    force?: boolean
    delay?: number 
  }) => {
    const now = Date.now()
    
    // Prevent too many redirects in a short time
    if (now - lastRedirectTime.current < 1000) {
      redirectCount.current++
      if (redirectCount.current > 5) {
        console.warn('⚠️ Too many redirects detected, stopping to prevent loop')
        return
      }
    } else {
      redirectCount.current = 0
    }
    
    // Prevent multiple simultaneous redirects
    if (redirectInProgress.current && !options?.force) {
      console.log('🔄 Redirect already in progress, skipping')
      return
    }

    lastRedirectTime.current = now
    redirectInProgress.current = true

    const delay = options?.delay || 0
    
    setTimeout(() => {
      console.log(`🚀 Safe redirect to: ${path}`)
      router.push(path)
      
      // Reset after a reasonable delay
      setTimeout(() => {
        redirectInProgress.current = false
      }, 2000)
    }, delay)
  }

  return { safeRedirect, redirectInProgress }
}