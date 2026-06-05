import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindv4 from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindv4(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // The static manifest acts as the primary/fallback PWA manifest.
      // In production, index.html dynamically upgrades this to the backend
      // manifest for clinic-specific branding.
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Legit HealthCare Management System',
        short_name: 'Legit HealthCare',
        description: 'Premium Healthcare Management System',
        background_color: '#000000',
        theme_color: '#000000',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      // manifestFilename controls the web app manifest file name in dist/
      // Leave as default (manifest.webmanifest) — do NOT use 'filename' here.
      // 'filename' would override the SERVICE WORKER filename, breaking SW registration.
      devOptions: {
        enabled: false,
        type: 'module',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Ignore backend manifest so the SW doesn't cache a stale clinic manifest
        globIgnores: ['**/manifest.json'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        maximumFileSizeToCacheInBytes: 10485760, // 10MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache uploaded branding assets from the backend
            urlPattern: /\/api\/branding\/uploads\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'branding-assets-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Network-first for API calls so fresh data is always preferred
            urlPattern: /^\/api\/(?!files\/view\/).*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: [
      '@hookform/resolvers',
      '@hookform/resolvers/zod',
      'react-hook-form',
      'zod',
      'recharts',
      'react-is'
    ],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
      },
    },
  },
})
