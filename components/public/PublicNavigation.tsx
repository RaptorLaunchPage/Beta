"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BRAND_GRAD, HEADER_BG } from "@/components/public/public-theme"
import { getButtonStyle } from "@/lib/global-theme"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"

// Clean navigation with fewer tabs
const NAV_ITEMS = [
  { name: "Home", href: "/public" },
  { name: "About", href: "/about" },
  { name: "Rewards", href: "/incentives" },
  { name: "Tier", href: "/tier-structure" },
  { name: "Apply", href: "/apply" },
  { name: "FAQ", href: "/faq" },
  { name: "Contact Us", href: "/contact" },
]

export function PublicNavigation() {
  const pathname = usePathname()

  return (
    <header className={`fixed top-0 left-0 right-0 z-30 ${HEADER_BG}`}>
      <div className="max-w-7xl mx-auto h-12 sm:h-14 px-3 sm:px-4 flex items-center justify-between gap-2">

        {/* Left Section: Mobile Menu & Brand */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mobile menu (left) - Hidden on desktop */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger aria-label="Open menu" className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-white/15 bg-black/50 backdrop-blur-sm text-white p-0">
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="left" className="bg-black/80 backdrop-blur-lg border-white/15 text-white w-72 pt-10">
                <div className="flex flex-col gap-3">
                  {NAV_ITEMS.map(({ name, href }) => (
                    <Link
                      key={name}
                      href={href}
                      className={`px-3 py-2 rounded-md text-sm ${pathname === href ? 'bg-white/10 border border-white/20' : 'hover:bg-white/10'} transition-colors`}
                    >
                      {name}
                    </Link>
                  ))}
                  <div className="h-px bg-white/10 my-2" />
                  <Link
                    href="/join-us"
                    className="px-3 py-2 rounded-md text-sm hover:bg-white/10 text-blue-400"
                  >
                    Join Us
                  </Link>
                  <Link
                    href="/auth/login"
                    className="px-3 py-2 rounded-md text-sm hover:bg-white/10 text-purple-400"
                  >
                    Dashboard Login
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Brand left with gradient */}
          <Link href="/public" className="font-extrabold tracking-wide text-transparent bg-gradient-to-r from-[#00C6FF] via-[#3A7DFF] to-[#B721FF] bg-clip-text drop-shadow-xl hover:brightness-110 transition-all text-sm sm:text-base whitespace-nowrap">
            RAPTOR ESPORTS
          </Link>
        </div>
        
        {/* Center nav names (desktop) - Hidden on mobile */}
        {/* We use a wrapper div to ensure 'hidden' applies effectively */}
        <div className="hidden md:block">
          <nav className="flex items-center gap-3 lg:gap-4">
            {NAV_ITEMS.map(({ name, href }) => (
              <Link
                key={name}
                href={href}
                className={`text-xs sm:text-sm text-white/80 hover:text-white transition-colors pb-0.5 border-b-2 cursor-pointer ${
                  pathname === href ? "border-white" : "border-transparent hover:border-white/40"
                }`}
                aria-label={`Go to ${name}`}
              >
                {name}
              </Link>
            ))}
          </nav>
        </div>
        
        {/* Right side: Dashboard button */}
        <div className="flex items-center gap-2">
          {/* On mobile, we might want to hide Join Us or make it smaller, but user said 'globally' */}
          <Link
            href="/join-us"
            className={`hidden xs:inline-flex px-2.5 sm:px-3 py-1.5 rounded-md font-semibold text-xs sm:text-sm cursor-pointer whitespace-nowrap ${getButtonStyle('secondary')}`}
          >
            Join Us
          </Link>
          <Link
            href="/auth/login"
            className={`px-2.5 sm:px-3 py-1.5 rounded-md font-semibold text-xs sm:text-sm cursor-pointer whitespace-nowrap ${getButtonStyle('primary')}`}
          >
            Dashboard
          </Link>
        </div>
      </div>
    </header>
  )
}
