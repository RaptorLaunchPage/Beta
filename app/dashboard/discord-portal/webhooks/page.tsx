"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function WebhooksPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Discord Webhooks</CardTitle>
        <CardDescription>Manage team and global Discord webhooks</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Webhooks management UI is currently unavailable. Please check back later.
        </p>
      </CardContent>
    </Card>
  )
}