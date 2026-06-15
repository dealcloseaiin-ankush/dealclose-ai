import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'DealClose AI',
        short_name: 'DealClose',
        description: 'AI Sales & Marketing Automation',
        theme_color: '#050505',
        background_color: '#050505',
        display: 'standalone',
        icons: [{ src: '/vite.svg', sizes: '192x192', type: 'image/svg+xml' }]
      }
    })
  ],
  esbuild: {
    loader: "jsx", // Treat .js files as JSX
    include: /src\/.*\.jsx?$/, // Apply to all .js and .jsx files in src
    exclude: [], 
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
})
