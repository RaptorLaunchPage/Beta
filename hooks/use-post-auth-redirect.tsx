"use client"

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthV2 as useAuth } from '@/hooks/use-auth-v2'
import { useSafeRedirect } from '@/lib/client-utils'

interface UsePostAuthRedirectOptions {
  /** Pages where auto-redirect should happen */
  redirectFromPages?: string[]
  /** Force redirect even if not on redirect pages */
  forceRedirect?: boolean
  /** Delay before redirect (ms) */
  redirectDelay?: number
}

/**
 * Unified post-auth redirect hook
 * Handles automatic redirects after both email and Discord authentication
 */
export function usePostAuthRedirect(options: UsePostAuthRedirectOptions = {}) {
  const {
    redirectFromPages = ['/', '/auth/confirm', '/auth/login', '/auth/signup'],
    forceRedirect = false,
    redirectDelay = 100
  } = options

  const { user, profile, isLoading, isAuthenticated, agreementStatus } = useAuth()
  const { safeRedirect } = useSafeRedirect()
  const router = useRouter()
  const pathname = usePathname()
  const hasRedirected = useRef(false)
  const redirectTimeout = useRef<NodeJS.Timeout | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    // Don't redirect if still loading, already redirected, or not properly authenticated
    if (isLoading || hasRedirected.current || !isAuthenticated || !user || !profile || !mounted.current) {
      return
    }

    // Check if we should redirect from current page
    const shouldRedirect = forceRedirect || redirectFromPages.includes(pathname)
    
    if (!shouldRedirect) {
      return
    }

    console.log(`🚀 Post-auth redirect: User authenticated on ${pathname}, determining redirect...`)

    // Determine correct redirect path with agreement priority
    let targetPath = '/dashboard'
    if (agreementStatus?.requiresAgreement) {
      targetPath = '/agreement-review'
      console.log('📝 Agreement required — redirecting to agreement review')
    } else if (profile.role === 'pending_player' && !profile.onboarding_completed) {
      targetPath = '/onboarding'
      console.log('🔄 New user needs onboarding')
    } else {
      console.log('🔄 Redirecting to dashboard')
    }

    // Don't redirect if already on target page
    if (pathname === targetPath) {
      console.log(`✅ Already on target page: ${targetPath}`)
      return
    }

    // Mark as redirected to prevent multiple redirects
    hasRedirected.current = true

    // Clear any existing timeout
    if (redirectTimeout.current) {
      clearTimeout(redirectTimeout.current)
    }

    // For homepage (likely Discord OAuth landing), redirect immediately
    const isHomepageRedirect = pathname === '/'
    const actualDelay = isHomepageRedirect ? 50 : redirectDelay

    console.log(`⚡ Executing post-auth redirect to: ${targetPath} (delay: ${actualDelay}ms)`) 

    // Perform redirect with delay
    redirectTimeout.current = setTimeout(() => {
      if (!mounted.current) return
      
      // Use router.replace to avoid back button issues
      router.replace(targetPath)
      
    }, actualDelay)

    return () => {
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current)
      }
    }
  }, [
    isAuthenticated, 
    user, 
    profile, 
    isLoading, 
    pathname, 
    forceRedirect, 
    redirectFromPages, 
    redirectDelay, 
    router, 
    safeRedirect,
    agreementStatus
  ])

  // Reset redirect flag when auth state changes
  useEffect(() => {
    if (!isAuthenticated || !user) {
      hasRedirected.current = false
    }
  }, [isAuthenticated, user])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current)
      }
    }
  }, [])

  const computedTarget = agreementStatus?.requiresAgreement
    ? '/agreement-review'
    : (profile?.role === 'pending_player' && !profile?.onboarding_completed ? '/onboarding' : '/dashboard')

  return {
    shouldRedirect: !isLoading && isAuthenticated && user && profile && !hasRedirected.current && mounted.current,
    targetPath: computedTarget,
    isRedirecting: hasRedirected.current
  }
}

/**
 * Hook for manual redirect triggering (for buttons, etc.)
 */
export function useManualRedirect() {
  const { user, profile, agreementStatus } = useAuth()
  const router = useRouter()

  const triggerRedirect = () => {
    if (!user || !profile) {
      console.warn('⚠️ Cannot redirect: User or profile not available')
      return
    }

    const targetPath = agreementStatus?.requiresAgreement
      ? '/agreement-review'
      : (profile.role === 'pending_player' && !profile.onboarding_completed 
        ? '/onboarding' 
        : '/dashboard')

    console.log(`🔄 Manual redirect triggered to: ${targetPath}`)
    router.replace(targetPath)
  }

  return {
    triggerRedirect,
    targetPath: agreementStatus?.requiresAgreement
      ? '/agreement-review'
      : (profile?.role === 'pending_player' && !profile?.onboarding_completed ? '/onboarding' : '/dashboard'),
    canRedirect: !!(user && profile)
  }
}