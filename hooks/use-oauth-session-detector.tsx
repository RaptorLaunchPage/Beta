"use client"

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/**
 * Specialized hook to detect OAuth sessions immediately on page load
 * Avoids extra redirects by deferring to unified post-auth redirect
 */
export function useOAuthSessionDetector() {
  const router = useRouter()
  const pathname = usePathname()
  const hasChecked = useRef(false)
  const isChecking = useRef(false)

  useEffect(() => {
    // Only run on homepage to detect OAuth returns
    if (!['/'].includes(pathname)) {
      return
    }

    // Don't run multiple times
    if (hasChecked.current || isChecking.current) {
      return
    }

    // Check for OAuth session immediately
    const checkOAuthSession = async () => {
      try {
        isChecking.current = true
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('OAuth Session Detector: Error getting session:', error)
          return
        }

        if (session?.user) {
          // Do not redirect to /auth/confirm; let usePostAuthRedirect on the homepage handle it
          // This prevents a visible intermediate verification screen
          return
        }
      } catch (error) {
        console.error('OAuth Session Detector: Exception:', error)
      } finally {
        hasChecked.current = true
        isChecking.current = false
      }
    }

    // Check immediately and also after a short delay
    checkOAuthSession()
    const timeoutId = setTimeout(checkOAuthSession, 500)
    return () => clearTimeout(timeoutId)
  }, [pathname, router])

  // Reset when pathname changes
  useEffect(() => {
    hasChecked.current = false
    isChecking.current = false
  }, [pathname])
}