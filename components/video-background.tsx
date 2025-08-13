"use client"

import React from "react"

interface VideoBackgroundProps {
  children: React.ReactNode
}

export function VideoBackground({ children }: VideoBackgroundProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        style={{ zIndex: -1 }}
      >
        <source src="/space-particles.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      {/* Content */}
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  )
}