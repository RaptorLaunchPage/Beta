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
  const router = useRouter()
  const pathname = usePathname()
  const hasRedirected = useRef(false)
  const mounted = useRef(true)

  useEffect(() => {
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    // Simple conditions: must be authenticated with profile and not already redirected
    if (!isAuthenticated || !user || !profile || isLoading || hasRedirected.current || !mounted.current) {
      return
    }

    // Check if we should redirect from current page
    const shouldRedirect = forceRedirect || redirectFromPages.includes(pathname)
    if (!shouldRedirect) {
      return
    }

    console.log(`🚀 Post-auth redirect: User authenticated on ${pathname}`)

    // Determine target path - simple logic
    let targetPath = '/dashboard'
    
    if (agreementStatus?.requiresAgreement) {
      targetPath = '/agreement-review'
      console.log('📝 Redirecting to agreement review')
    } else if (profile.role === 'pending_player' && !profile.onboarding_completed) {
      targetPath = '/onboarding'
      console.log('🔄 Redirecting to onboarding')
    } else {
      console.log('🔄 Redirecting to dashboard')
    }

    // Don't redirect if already on target page
    if (pathname === targetPath) {
      console.log(`✅ Already on target page: ${targetPath}`)
      return
    }

    // Mark as redirected and perform redirect
    hasRedirected.current = true
    console.log(`⚡ Redirecting to: ${targetPath}`)
    
    setTimeout(() => {
      if (mounted.current) {
        router.replace(targetPath)
      }
    }, redirectDelay)

  }, [isAuthenticated, user, profile, isLoading, pathname, forceRedirect, redirectFromPages, redirectDelay, router, agreementStatus])

  // Reset redirect flag when auth state changes
  useEffect(() => {
    if (!isAuthenticated || !user) {
      hasRedirected.current = false
    }
  }, [isAuthenticated, user])

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