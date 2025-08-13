"use client"

import { useState } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { VideoBackground } from "@/components/video-background"
import { PublicNavigation } from "@/components/public/PublicNavigation"
import { PublicFooter } from "@/components/public/PublicFooter"
import { getButtonStyle } from "@/lib/global-theme"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)
    const { error } = await resetPassword(email)
    if (error) {
      setError(error.message || "Failed to send reset email. Please try again.")
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  return (
    <VideoBackground>
      <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto flex flex-col">
        <PublicNavigation />
        
        <div className="flex-1 flex items-center justify-center p-4">
          {/* Subtle white glowing dots */}
          <div className="pointer-events-none fixed left-1/4 top-1/3 z-10 h-6 w-6 rounded-full bg-white opacity-60 blur-2xl animate-pulse" />
          <div className="pointer-events-none fixed right-1/4 bottom-1/4 z-10 h-3 w-3 rounded-full bg-white opacity-40 blur-md animate-pulse" />
          <div className="w-full max-w-md">
        <Card className="w-full max-w-md bg-black/60 backdrop-blur-md border border-white/20 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="esports-heading text-2xl text-white font-semibold">Forgot Password</CardTitle>
            <CardDescription className="text-slate-200">Enter your email to receive a password reset link</CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <Alert variant="default">
                <AlertDescription>
                  If an account with that email exists, a password reset link has been sent.
                  <br />
                  Please check your inbox (and spam folder).
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="bg-transparent border-white/20 text-white placeholder:text-slate-400 focus:ring-white/30"
                  />
                </div>
                <Button type="submit" className={`w-full ${getButtonStyle('primary')}`} disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            )}
            <div className="mt-4 text-center">
              <Link href="/auth/login" className="text-slate-400 hover:text-white text-sm">
                Back to login
              </Link>
            </div>
          </CardContent>
        </Card>
          </div>
        </div>
        <PublicFooter />
      </div>
    </VideoBackground>
  )
}