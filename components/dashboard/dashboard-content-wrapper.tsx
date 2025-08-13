"use client"

import React from "react"

interface DashboardContentWrapperProps {
  children: React.ReactNode
}

export function DashboardContentWrapper({ children }: DashboardContentWrapperProps) {
  return (
    <div className="dashboard-content text-white">
      {children}
    </div>
  )
}
