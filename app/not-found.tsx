"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { VideoBackground } from "@/components/video-background"
import { PublicNavigation } from "@/components/public/PublicNavigation"
import { PublicFooter } from "@/components/public/PublicFooter"
import { getButtonStyle } from "@/lib/global-theme"
import { Home, Search, ArrowLeft, Gamepad2, Shield, Zap } from "lucide-react"

export default function NotFound() {
  return (
    <VideoBackground>
      <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto flex flex-col">
        <PublicNavigation />
        
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-xl w-full">
            <h1 className="text-7xl font-bold text-white mb-3">404</h1>
            <p className="text-slate-200 mb-8">Page not found</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/">
                <Button className={`${getButtonStyle('primary')}`}>
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="outline" className={`${getButtonStyle('outline')}`}>
                  <Shield className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <PublicFooter />
      </div>
    </VideoBackground>
  )
}