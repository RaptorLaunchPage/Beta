"use client"

import React from "react"
import { BRAND_GRAD, HEADER_BG } from "@/components/public/public-theme"

export function PublicHeader({ rightCta }: { rightCta?: React.ReactNode }) {
  return (
    <header className={`h-14 flex items-center px-3 sm:px-4 ${HEADER_BG}`}>
      <div className={`font-extrabold tracking-wide text-transparent ${BRAND_GRAD} bg-clip-text`}>RAPTOR ESPORTS</div>
      <div className="ml-auto">{rightCta}</div>
    </header>
  )
}