"use client"

import React, { useEffect, useRef, useState } from "react"

interface FadeInOnScrollProps {
  children: React.ReactNode
  className?: string
  as?: keyof JSX.IntrinsicElements
  delayMs?: number
  initialVisible?: boolean
  fallbackMs?: number
}

export function FadeInOnScroll({ children, className = "", as = "div", delayMs = 0, initialVisible = false, fallbackMs = 800 }: FadeInOnScrollProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(initialVisible)

  useEffect(() => {
    if (initialVisible) return

    const el = ref.current
    if (!el) return

    let didSet = false

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            didSet = true
            setTimeout(() => setVisible(true), delayMs)
            observer.disconnect()
            break
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    )

    observer.observe(el)

    // Fallback in case observer doesn't trigger (e.g., horizontal slider contexts)
    const t = window.setTimeout(() => {
      if (!didSet) setVisible(true)
    }, Math.max(0, delayMs + fallbackMs))

    return () => {
      observer.disconnect()
      window.clearTimeout(t)
    }
  }, [delayMs, initialVisible, fallbackMs])

  const Tag = as as any
  return (
    <Tag
      ref={ref as any}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"} ${className}`}
    >
      {children}
    </Tag>
  )
}