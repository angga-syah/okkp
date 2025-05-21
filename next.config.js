// next.config.js
const path = require('path');

// Add bundle analyzer (only loaded when needed)
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.sanity.io' },
      { protocol: 'https', hostname: 'vhacbiaaaifuavginczh.supabase.co' },
      { protocol: 'https', hostname: 'supabase.co' },
      { protocol: 'https', hostname: 'supabase.in' },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  
  // Performance optimizations
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  
  // SWC compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
    styledComponents: true,
  },
  
  // Experimental features - keep only what you're using
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    optimizePackageImports: [
      'framer-motion', 
      'react-hot-toast', 
      'next-auth'
    ],
  },
  
  // Strict mode
  reactStrictMode: true,
  
  // Custom webpack configuration - simplified
  webpack: (config, { dev, isServer }) => {
    // Production-only optimizations
    if (!dev && !isServer) {
      // Optimize chunk splitting
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
        cacheGroups: {
          framework: {
            name: 'framework',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react|react-dom|next|@next)[\\/]/,
            priority: 40,
          },
          lib: {
            test: /[\\/]node_modules[\\/]/,
            priority: 20,
            chunks: 'async',
          },
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 10,
            chunks: 'async',
            reuseExistingChunk: true,
          },
        },
      };
      
      // Configure terser for production
      if (process.env.NODE_ENV === 'production') {
        const TerserPlugin = require('terser-webpack-plugin');
        config.optimization.minimizer = config.optimization.minimizer || [];
        config.optimization.minimizer.push(
          new TerserPlugin({
            terserOptions: {
              compress: {
                drop_console: true,
                passes: 2,
              },
              mangle: true,
              output: {
                comments: false,
              },
            },
            extractComments: false,
          })
        );
      }
    }
    
    return config;
  },
  
  // HTTP headers for CORS only - security headers moved to middleware
  async headers() {
    return [
      {
        // API-specific CORS headers
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { 
            key: 'Access-Control-Allow-Origin', 
            value: process.env.NODE_ENV === 'production' 
              ? 'https://demo.fortunasadanioga.com' 
              : 'http://localhost:3000'
          },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { 
            key: 'Access-Control-Allow-Headers', 
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' 
          }
        ]
      }
      // Security headers removed from here as they're now in middleware
    ];
  },
  
  // Environment variable loading
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  },
  
  // Output directory config
  distDir: process.env.BUILD_DIR || '.next',
  
  // Build-time optimization
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Output configuration
  output: process.env.STANDALONE === 'true' ? 'standalone' : undefined,
};

// Apply bundle analyzer and export
module.exports = withBundleAnalyzer(nextConfig);