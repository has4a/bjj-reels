/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base './' => appka funguje z ľubovoľnej podcesty (GitHub Pages, Netlify, lokálny server)
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      // ikony a favicon pokrýva globPatterns nižšie
      includeManifestIcons: false,
      manifest: {
        id: './',
        name: 'BJJ Reels',
        short_name: 'BJJ Reels',
        description: 'Osobný triedič uložených BJJ reels z Instagramu. Dáta zostávajú v tomto zariadení.',
        lang: 'sk',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0c0e',
        theme_color: '#0b0c0e',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Android: v Instagrame "Zdieľať" -> BJJ Reels. Prehliadač otvorí ./?url=...&text=...
        share_target: {
          action: './',
          method: 'GET',
          params: { title: 'title', text: 'text', url: 'url' },
        },
      },
      workbox: {
        // písmo (latin + latin-ext) musí byť v cache, inak offline spadne na systémové
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
        globIgnores: ['**/*vietnamese*'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
