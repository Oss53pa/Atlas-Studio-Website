import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' mode: we register the SW manually in main.tsx and decide
      // when to call updateSW(). Combined with the auto-reload hook, every
      // visit picks up the latest deploy without users having to clear cache.
      registerType: 'prompt',
      injectRegister: false, // we handle registration ourselves in main.tsx
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: 'Atlas Studio',
        short_name: 'Atlas Studio',
        description: 'Solutions digitales professionnelles pour les entreprises africaines',
        theme_color: '#0A0F1A',
        background_color: '#0A0F1A',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/pwa-512x512.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: '/pwa-512x512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // skipWaiting + clientsClaim combines avec un updateSW(true) cote
        // main.tsx ont cause une BOUCLE INFINIE de mises a jour SW
        // (635 versions creees en <1h sur atlas-studio.org). On desactive
        // skipWaiting pour que la nouvelle SW attende le clic user.
        skipWaiting: false,
        clientsClaim: false,
        cleanupOutdatedCaches: true,
        // Use NetworkFirst for navigation: if network is up, the SW serves fresh
        // index.html (and therefore fresh JS/CSS hashes). Only falls back to
        // cache when offline. This kills "stale UI after deploy" issues.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/admin/, /^\/portal/, /^\/api/],
        runtimeCaching: [
          // Always try the network for HTML navigations — guarantees fresh deploys
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          // Supabase API: NetworkFirst with short cache (already in place)
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
