"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Users, UserCheck, Calendar } from "lucide-react"

export default function TeamManagementLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const getActiveTab = () => {
    if (pathname.includes("/team-management/teams")) return "teams"
    if (pathname.includes("/team-management/roster")) return "roster"
    if (pathname.includes("/team-management/slots")) return "slots"
    return "teams" // Default to teams
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
        <p className="text-muted-foreground">Manage your teams, rosters, and slot bookings</p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-white/20">
        <nav className="flex space-x-1 overflow-x-auto scrollbar-hide">
          <Link href="/dashboard/team-management/teams">
            <Button
              variant={getActiveTab() === "teams" ? "default" : "ghost"}
              size="sm"
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Users className="h-4 w-4" />
              Teams
            </Button>
          </Link>
          <Link href="/dashboard/team-management/roster">
            <Button
              variant={getActiveTab() === "roster" ? "default" : "ghost"}
              size="sm"
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <UserCheck className="h-4 w-4" />
              Roster
            </Button>
          </Link>
          <Link href="/dashboard/team-management/slots">
            <Button
              variant={getActiveTab() === "slots" ? "default" : "ghost"}
              size="sm"
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Calendar className="h-4 w-4" />
              Slot Booking
            </Button>
          </Link>
        </nav>
      </div>
      
      <div className="mt-6">
        {children}
      </div>
    </div>
  )
}
