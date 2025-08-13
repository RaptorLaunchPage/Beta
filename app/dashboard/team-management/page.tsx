"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { COMPONENT_STYLES } from "@/lib/global-theme"

export default function TeamManagementHomePage() {
  const router = useRouter()

  useEffect(() => {
    // Simple redirect to teams section
    router.replace("/dashboard/team-management/teams")
  }, [router])

  return (
    <div className={COMPONENT_STYLES.loadingContainer}>
      <div className={COMPONENT_STYLES.loadingCard}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        <p className="text-white font-medium">Loading team management...</p>
      </div>
    </div>
  )
}
