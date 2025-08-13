"use client"

/**
 * Global Loading State Manager
 * Consolidates all loading states across the application into a single, efficient system
 * Eliminates race conditions and provides consistent loading UX
 */

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react'

export type LoadingState = 
  | 'idle'
  | 'connecting' 
  | 'authenticating'
  | 'checking-agreement'
  | 'loading-profile'
  | 'initializing'
  | 'redirecting'
  | 'processing'
  | 'error'

export interface GlobalLoadingState {
  isLoading: boolean
  currentState: LoadingState
  message?: string
  progress?: number
  error?: string
  timeout?: number
}

export interface LoadingOperation {
  id: string
  state: LoadingState
  message?: string
  progress?: number
  priority: number // Higher number = higher priority
  timeout?: number
}

class GlobalLoadingManager {
  private static instance: GlobalLoadingManager
  private operations: Map<string, LoadingOperation> = new Map()
  private listeners: Set<(state: GlobalLoadingState) => void> = new Set()
  private timeouts: Map<string, NodeJS.Timeout> = new Map()

  static getInstance(): GlobalLoadingManager {
    if (!GlobalLoadingManager.instance) {
      GlobalLoadingManager.instance = new GlobalLoadingManager()
    }
    return GlobalLoadingManager.instance
  }

  private constructor() {}

  // Subscribe to loading state changes
  subscribe(listener: (state: GlobalLoadingState) => void): () => void {
    this.listeners.add(listener)
    // Immediately send current state
    listener(this.getCurrentState())
    return () => this.listeners.delete(listener)
  }

  // Start a loading operation
  startLoading(
    id: string, 
    state: LoadingState, 
    options: {
      message?: string
      progress?: number
      priority?: number
      timeout?: number
    } = {}
  ): void {
    const operation: LoadingOperation = {
      id,
      state,
      message: options.message,
      progress: options.progress,
      priority: options.priority ?? 0,
      timeout: options.timeout
    }

    this.operations.set(id, operation)

    // Set up timeout if specified
    if (options.timeout) {
      this.clearTimeout(id)
      const timeoutId = setTimeout(() => {
        this.completeLoading(id, 'error', 'Operation timed out')
      }, options.timeout)
      this.timeouts.set(id, timeoutId)
    }

    this.notifyListeners()
  }

  // Update an existing loading operation
  updateLoading(
    id: string,
    updates: {
      state?: LoadingState
      message?: string
      progress?: number
    }
  ): void {
    const operation = this.operations.get(id)
    if (operation) {
      this.operations.set(id, { ...operation, ...updates })
      this.notifyListeners()
    }
  }

  // Complete a loading operation
  completeLoading(id: string, finalState?: LoadingState, error?: string): void {
    this.clearTimeout(id)
    
    if (finalState === 'error' && error) {
      // Keep error state briefly before removing
      const operation = this.operations.get(id)
      if (operation) {
        this.operations.set(id, { ...operation, state: 'error' })
        this.notifyListeners()
        
        setTimeout(() => {
          this.operations.delete(id)
          this.notifyListeners()
        }, 3000) // Show error for 3 seconds
      }
    } else {
      this.operations.delete(id)
      this.notifyListeners()
    }
  }

  // Get current loading state based on highest priority operation
  private getCurrentState(): GlobalLoadingState {
    if (this.operations.size === 0) {
      return {
        isLoading: false,
        currentState: 'idle'
      }
    }

    // Find highest priority operation
    let highestPriorityOp: LoadingOperation | null = null
    for (const operation of this.operations.values()) {
      if (!highestPriorityOp || operation.priority > highestPriorityOp.priority) {
        highestPriorityOp = operation
      }
    }

    if (!highestPriorityOp) {
      return {
        isLoading: false,
        currentState: 'idle'
      }
    }

    return {
      isLoading: true,
      currentState: highestPriorityOp.state,
      message: highestPriorityOp.message,
      progress: highestPriorityOp.progress,
      timeout: highestPriorityOp.timeout
    }
  }

  // Clear timeout for an operation
  private clearTimeout(id: string): void {
    const timeoutId = this.timeouts.get(id)
    if (timeoutId) {
      clearTimeout(timeoutId)
      this.timeouts.delete(id)
    }
  }

  // Notify all listeners of state change
  private notifyListeners(): void {
    const currentState = this.getCurrentState()
    this.listeners.forEach(listener => listener(currentState))
  }

  // Get all active operations (for debugging)
  getActiveOperations(): LoadingOperation[] {
    return Array.from(this.operations.values())
  }

  // Clear all operations (emergency reset)
  clearAll(): void {
    // Clear all timeouts
    this.timeouts.forEach(timeoutId => clearTimeout(timeoutId))
    this.timeouts.clear()
    
    // Clear all operations
    this.operations.clear()
    this.notifyListeners()
  }
}

// React Context for the loading manager
const GlobalLoadingContext = createContext<GlobalLoadingState | null>(null)

// Provider component
export function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
  const [loadingState, setLoadingState] = useState<GlobalLoadingState>({
    isLoading: false,
    currentState: 'idle'
  })

  useEffect(() => {
    const manager = GlobalLoadingManager.getInstance()
    const unsubscribe = manager.subscribe(setLoadingState)
    return unsubscribe
  }, [])

  return (
    <GlobalLoadingContext.Provider value={loadingState}>
      {children}
    </GlobalLoadingContext.Provider>
  )
}

// Hook to use global loading state
export function useGlobalLoading(): GlobalLoadingState & {
  startLoading: (id: string, state: LoadingState, options?: any) => void
  updateLoading: (id: string, updates: any) => void
  completeLoading: (id: string, finalState?: LoadingState, error?: string) => void
  clearAll: () => void
} {
  const context = useContext(GlobalLoadingContext)
  if (!context) {
    throw new Error('useGlobalLoading must be used within a GlobalLoadingProvider')
  }

  const manager = GlobalLoadingManager.getInstance()

  return {
    ...context,
    startLoading: manager.startLoading.bind(manager),
    updateLoading: manager.updateLoading.bind(manager),
    completeLoading: manager.completeLoading.bind(manager),
    clearAll: manager.clearAll.bind(manager)
  }
}

// Convenience hooks for common loading operations
export function useAuthLoading() {
  const { startLoading, updateLoading, completeLoading } = useGlobalLoading()

  return {
    startAuth: () => startLoading('auth', 'authenticating', { priority: 10, message: 'Authenticating...' }),
    startProfile: () => updateLoading('auth', { state: 'loading-profile', message: 'Loading profile...' }),
    startAgreement: () => updateLoading('auth', { state: 'checking-agreement', message: 'Checking agreements...' }),
    startInitializing: () => updateLoading('auth', { state: 'initializing', message: 'Setting up dashboard...' }),
    completeAuth: () => completeLoading('auth'),
    errorAuth: (error: string) => completeLoading('auth', 'error', error)
  }
}

export function usePageLoading() {
  const { startLoading, completeLoading } = useGlobalLoading()

  return {
    startPageLoad: (page: string) => startLoading(`page-${page}`, 'processing', { 
      priority: 5, 
      message: `Loading ${page}...` 
    }),
    completePageLoad: (page: string) => completeLoading(`page-${page}`)
  }
}

export default GlobalLoadingManager