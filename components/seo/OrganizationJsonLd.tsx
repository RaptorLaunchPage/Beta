"use client"

export default function OrganizationJsonLd() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://raptor-esports.example'
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Raptor Esports',
    url: siteUrl,
    logo: `${siteUrl}/RLogo.ico`,
    sameAs: [
      'https://www.instagram.com/rexigris?igsh=MXVxMDFpMXNhYWQ1cQ=='
    ]
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}