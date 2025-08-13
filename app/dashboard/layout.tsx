'use client'

import { NewDashboardLayout } from '@/components/dashboard/new-dashboard-layout'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Remove duplicate loading logic - let NewDashboardLayout handle it
  // Auth and route checking is handled by RouteGuard
  return (
    <NewDashboardLayout>
      {children}
    </NewDashboardLayout>
  )
}