import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: 'Atlas Studio',
        short_name: 'Atlas Studio',
        description: 'Solutions digitales professionnelles pour les entreprises africaines',
        theme_color: '#0A0A0A',
        background_color: '#FAFAF8',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/pwa-512x512.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: '/pwa-512x512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Force the new SW to activate immediately and take over all open tabs
        // so users don't stay stuck on a cached old bundle after a deploy.
        skipWaiting: true,
        clientsClaim: true,
        // Remove any previously cached files on SW activation
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        // Never serve the cached index.html for these paths — always hit network
        navigateFallbackDenylist: [/^\/admin/, /^\/portal/, /^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'supabase-cache', expiration: { maxEntries: 50, maxAgeSeconds: 300 } },
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
