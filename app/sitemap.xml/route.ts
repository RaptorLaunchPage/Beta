import { NextResponse } from 'next/server'

const PUBLIC_ROUTES = [
  '/',
  '/public',
  '/about',
  '/incentives',
  '/tier-structure',
  '/gallery',
  '/join-us',
  '/contact',
  '/faq',
]

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://raptor-esports.example'
  const urls = PUBLIC_ROUTES.map((path) => `  <url><loc>${siteUrl}${path}</loc><changefreq>weekly</changefreq><priority>${path === '/' ? '1.0' : '0.7'}</priority></url>`).join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
  return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml' } })
}