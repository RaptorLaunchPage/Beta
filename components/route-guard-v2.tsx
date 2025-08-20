"use client"

import { useEffect, useState, memo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSafeRedirect } from '@/lib/client-utils'
import { useGlobalLoading } from '@/lib/global-loading-manager'

interface RouteGuardV2Props {
  children: React.ReactNode
}

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/public',
  '/auth/login',
  '/auth/signup',
  '/auth/confirm',
  '/auth/forgot',
  '/auth/reset-password',
  '/about',
  '/incentives',
  '/tier-structure',
  '/apply',
  '/join-us',
  '/contact',
  '/faq',
  '/error',
  '/not-found',
  '/_not-found',
  '/global-error'
]

// API routes and static assets
const isPublicRoute = (pathname: string): boolean => {
  // API routes are public (they handle their own auth)
  if (pathname.startsWith('/api/')) return true
  
  // Static assets
  if (pathname.startsWith('/_next/')) return true
  if (pathname.includes('.')) return true // Files with extensions
  
  // Explicit public routes
  return PUBLIC_ROUTES.some(route => {
    if (route === '/') return pathname === '/'
    return pathname.startsWith(route)
  })
}

const RouteGuardV2 = memo(function RouteGuardV2({ children }: RouteGuardV2Props) {
  const router = useRouter()
  const pathname = usePathname()
  const { safeRedirect } = useSafeRedirect()
  const { startLoading, completeLoading, updateLoading } = useGlobalLoading()
  const [authState, setAuthState] = useState<any>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize auth and handle state changes
  useEffect(() => {
    let mounted = true
    let unsubscribe: (() => void) | null = null

    const initializeAuth = async () => {
      try {
        // Dynamic import to avoid potential circular dependencies
        const { default: authFlowV2 } = await import('@/lib/auth-flow-v2')

        if (!mounted) return

        // Subscribe to auth state changes first
        unsubscribe = authFlowV2.subscribe((newState) => {
          if (!mounted) return
          setAuthState(newState)
          
          // Mark as initialized when auth flow is ready
          if (newState.isInitialized) {
            setIsInitialized(true)
          }
        })

        // Check if already initialized to prevent duplicate calls
        const currentState = authFlowV2.getState()
        if (currentState.isInitialized) {
          setAuthState(currentState)
          setIsInitialized(true)
          return
        }

        // Initialize auth flow once - don't reinitialize on pathname changes
        await authFlowV2.initialize(true)
      } catch (error: any) {
        // Fallback to allow access if auth fails completely
        setIsInitialized(true)
      }
    }

    initializeAuth()

    return () => {
      mounted = false
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, []) // Remove pathname dependency to prevent re-initialization

  // Handle route protection logic
  useEffect(() => {
    if (!isInitialized || !authState) {
      return // Still waiting for auth initialization
    }

    // Only handle basic route protection for unauthenticated users
    if (!authState.isAuthenticated && !isPublicRoute(pathname)) {
      console.log(`🚫 Unauthenticated user trying to access protected route: ${pathname}`)
      safeRedirect('/')
      return
    }

    // For authenticated users, let the auth flow handle redirects
    // Don't make routing decisions here to avoid conflicts
  }, [authState, isInitialized, pathname, safeRedirect])

  // For public routes, render immediately without waiting for auth initialization
  if (isPublicRoute(pathname)) {
    return <>{children}</>
  }

  // For protected routes, wait for auth initialization
  if (!isInitialized) {
    return null
  }

  // Render children if all checks pass
  return <>{children}</>
})

export { RouteGuardV2 }