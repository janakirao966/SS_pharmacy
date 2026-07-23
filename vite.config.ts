import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VERCEL ? '/' : '/SS_pharmacy/',
  server: {
    allowedHosts: true
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        globIgnores: ['**/backup/**', '**/*.png'],
        maximumFileSizeToCacheInBytes: 10485760 // 10 MiB
      },
      manifest: false, // preserve existing public/manifest.json
      devOptions: {
        enabled: true
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom')) {
              return 'vendor-react-dom';
            }
            if (id.includes('react') || id.includes('scheduler')) {
              return 'vendor-react-core';
            }
            if (id.includes('react-router-dom') || id.includes('react-router') || id.includes('@remix-run')) {
              return 'vendor-router';
            }
            if (id.includes('lucide-react') || id.includes('@phosphor-icons')) {
              return 'vendor-icons';
            }
            if (id.includes('workbox')) {
              return 'vendor-workbox';
            }
            return 'vendor-libs';
          }
        }
      }
    }
  }
})
