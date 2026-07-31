import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages project sites are served from /<repo>/, so assets need that
// prefix. Override with BASE_PATH=/ if you ever move to a custom domain.
const base = process.env.BASE_PATH ?? '/dateideas/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt', not 'autoUpdate': autoUpdate can reload the page out from
      // under you mid-sentence. This shows a pill instead and lets you choose
      // the moment — with an update check on every focus, so it appears within
      // seconds of a deploy rather than whenever the browser feels like it.
      registerType: 'prompt',
      // public/manifest.webmanifest is already written and linked by hand.
      manifest: false,
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-512.png',
        'manifest.webmanifest',
      ],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Deliberately no runtimeCaching. Firestore keeps its own offline
        // cache, and map tiles must never be served stale — a cached map is
        // worse than an honest blank one.
      },
    }),
  ],
})
