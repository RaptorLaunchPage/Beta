"use client"

import React from "react"
import { FOOTER_BG } from "@/components/public/public-theme"
import { Instagram, MessageCircle } from "lucide-react"

export function PublicFooter() {
  return (
    <footer className={`h-12 flex items-center justify-between px-3 sm:px-4 ${FOOTER_BG} text-white/70 text-xs sm:text-sm`}>
      <div className="flex items-center gap-4">
        <span className="hidden sm:inline">© {new Date().getFullYear()} Raptor Esports</span>
      </div>
      <div className="flex items-center gap-3">
        <a aria-label="Instagram" href="https://www.instagram.com/rexigris?igsh=MXVxMDFpMXNhYWQ1cQ==" target="_blank" rel="noreferrer" className="hover:text-white inline-flex">
          <Instagram className="h-4 w-4" />
        </a>
        <a aria-label="Discord" href="#" className="hover:text-white inline-flex">
          <MessageCircle className="h-4 w-4" />
        </a>
      </div>
    </footer>
  )
}