import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/SS_pharmacy/',
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
    chunkSizeWarningLimit: 250, // Flag chunk sizes over 250kB
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            if (id.includes('react-router-dom') || id.includes('react-router') || id.includes('@remix-run')) {
              return 'vendor-router';
            }
            if (id.includes('lucide-react')) {
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
