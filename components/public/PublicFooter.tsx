"use client"

import React from "react"
import { FOOTER_BG } from "@/components/public/public-theme"
import { Instagram, MessageCircle } from "lucide-react"

export function PublicFooter() {
  return (
    <footer className={`h-12 flex items-center justify-between px-3 sm:px-4 ${FOOTER_BG} text-white/70 text-xs sm:text-sm`}>
      <div className="flex items-center gap-4">
        <span className="hidden sm:inline">© {new Date().getFullYear()} Raptor Esports</span>
        <span className="sm:hidden">© {new Date().getFullYear()} Raptor</span>
      </div>
    </footer>
  )
}
