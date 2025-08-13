import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProviderV2 } from "@/hooks/use-auth-v2"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { RouteGuardV2 } from "@/components/route-guard-v2"
import { LoadingErrorBoundary } from "@/components/loading-error-boundary"
import { GlobalLoadingProvider } from "@/lib/global-loading-manager"
import GlobalLoading from "@/components/ui/global-loading"
import OrganizationJsonLd from "@/components/seo/OrganizationJsonLd"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://raptor-esports.example'),
  title: {
    default: "Raptor Esports",
    template: "%s | Raptor Esports",
  },
  description: "Raptor Esports — official hub for teams, players, and fans.",
  generator: 'Raptor Esports Hub v1.0',
  keywords: ['Raptor Esports', 'esports', 'gaming', 'tournaments', 'teams', 'players'],
  authors: [{ name: 'Raptor Esports' }],
  creator: 'Raptor Esports',
  publisher: 'Raptor Esports',
  applicationName: 'Raptor Esports',
  icons: {
    icon: '/RLogo.ico',
    shortcut: '/RLogo.ico',
    apple: '/RLogo.ico',
  },
  openGraph: {
    siteName: 'Raptor Esports',
    type: 'website',
    images: [{ url: '/og-image.jpg' }],
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@RaptorEsports',
    images: ['/og-image.jpg'],
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-transparent`}>
        <LoadingErrorBoundary>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            <GlobalLoadingProvider>
              <AuthProviderV2>
                <RouteGuardV2>
                  {children}
                </RouteGuardV2>
                <GlobalLoading />
                <Toaster />
                <OrganizationJsonLd />
              </AuthProviderV2>
            </GlobalLoadingProvider>
          </ThemeProvider>
        </LoadingErrorBoundary>
      </body>
    </html>
  )
}
