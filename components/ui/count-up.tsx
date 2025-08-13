"use client"

import React, { useEffect, useRef } from 'react'
import anime from 'animejs'

interface CountUpProps {
  value: number
  duration?: number
  delay?: number
  className?: string
}

export function CountUp({ value, duration = 2000, delay = 0, className = "" }: CountUpProps) {
  const countRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (countRef.current) {
      anime({
        targets: countRef.current,
        innerHTML: [0, value],
        round: 1,
        duration: duration,
        delay: delay,
        easing: 'easeOutExpo'
      })
    }
  }, [value, duration, delay])

  return (
    <span ref={countRef} className={className}>
      0
    </span>
  )
}