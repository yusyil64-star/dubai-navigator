import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Unterordner, unter dem die App liegt. Lokal "/", auf GitHub Pages "/dubai-navigator/"
  // (wird im Veröffentlichungs-Workflow .github/workflows/deploy.yml gesetzt).
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    // Macht die App installierbar (PWA) und lässt die Oberfläche auch offline starten
    VitePWA({
      // neue Versionen werden automatisch übernommen – aber nie mitten in einer Fahrt (siehe src/pwa.ts)
      registerType: 'prompt',
      injectRegister: false, // Registrierung macht src/pwa.ts selbst
      manifest: {
        name: 'Dubai Navigator',
        short_name: 'Dubai Nav',
        description: 'Navigation for Dubai',
        lang: 'en',
        theme_color: '#f4f1ea',
        background_color: '#f4f1ea',
        display: 'standalone', // ohne Browserleiste, wie eine echte App
        // start_url und scope setzt das Plugin automatisch passend zum Unterordner (base)
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Diese App-Dateien werden für den Offline-Start gespeichert (.mjs = Karten-Worker).
        // Die Kartenbilder selbst werden NICHT gespeichert – dafür braucht man Internet.
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,ico}'],
      },
    }),
  ],
})
