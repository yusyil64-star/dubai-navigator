// Erzeugt alle App-Symbole (verschiedene Größen) aus public/favicon.svg.
// Ausführen mit: npm run generate-pwa-assets
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

const BACKGROUND = '#f4f1ea' // Sandweiß, wie in der App

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    // Normale Symbole: Logo füllt die ganze Fläche
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    // "Maskable": Android schneidet das Symbol z. B. rund zu – daher Rand + Hintergrundfarbe
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: BACKGROUND } },
    // Symbol für iPhone/iPad
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: BACKGROUND } },
  },
  images: ['public/favicon.svg'],
})
