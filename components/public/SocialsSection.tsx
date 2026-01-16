"use client"

import React from "react"
import { Instagram, MessageCircle } from "lucide-react"

export function SocialsSection() {
  return (
    <div className="w-full py-12 flex flex-col items-center gap-6 z-10 relative">
       <h3 className="text-2xl font-bold text-white mb-4 drop-shadow-md">Our Socials</h3>
       <div className="flex flex-wrap justify-center gap-4 px-4">
          <a href="https://discord.gg/tjTjMpHvpa" target="_blank" rel="noreferrer"
             className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg transition-all transform hover:scale-105">
             <MessageCircle className="w-5 h-5" />
             <span>Join Discord</span>
          </a>
          <a href="https://www.instagram.com/rexigris?igsh=MXVxMDFpMXNhYWQ1cQ==" target="_blank" rel="noreferrer"
             className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-semibold shadow-lg transition-all transform hover:scale-105">
             <Instagram className="w-5 h-5" />
             <span>Follow Instagram</span>
          </a>
       </div>
    </div>
  )
}
