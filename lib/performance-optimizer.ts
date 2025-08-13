/**
 * Performance Optimization Utilities
 * Provides utilities for optimizing React components and removing debug code
 */

import React from 'react'

// Production-safe logging function
export const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args)
  }
}

export const devError = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(...args)
  }
}

export const devWarn = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(...args)
  }
}

// Performance monitoring utility
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private timers: Map<string, number> = new Map()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  startTimer(name: string): void {
    if (process.env.NODE_ENV === 'development') {
      this.timers.set(name, performance.now())
    }
  }

  endTimer(name: string): number {
    if (process.env.NODE_ENV === 'development') {
      const start = this.timers.get(name)
      if (start) {
        const duration = performance.now() - start
        console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`)
        this.timers.delete(name)
        return duration
      }
    }
    return 0
  }

  measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (process.env.NODE_ENV === 'development') {
      this.startTimer(name)
      return fn().finally(() => this.endTimer(name))
    }
    return fn()
  }
}

// Component optimization helpers
export const createMemoizedComponent = <P extends object>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
) => {
  return React.memo(Component, propsAreEqual)
}

// Debounce utility for performance
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

// Throttle utility for performance
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Lazy loading utility
export const createLazyComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) => {
  return React.lazy(importFn)
}

export default PerformanceMonitor