/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    domains: ['localhost', 'qjdlvbwmfwbxgwowqhyz.supabase.co'],
  },
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  swcMinify: true,
  poweredByHeader: false,
  generateEtags: false,
  compress: true,
  // More selective build-time checks to catch critical errors while allowing warnings
  eslint: {
    ignoreDuringBuilds: false, // Enable ESLint checks during build
  },
  typescript: {
    ignoreBuildErrors: false, // Enable TypeScript checks during build
  },
  // Disable static optimization for API routes during build
  experimental: {
    serverComponentsExternalPackages: [],
    serverActions: {
      allowedOrigins: ["localhost:3000", "*.vercel.app"],
    },
  },
  // Bundle optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimize bundle splitting
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            enforce: true,
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      }
    }
    return config
  },
}

export default nextConfig
