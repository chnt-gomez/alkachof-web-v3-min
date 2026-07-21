import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/Volumes/BANK/Projects/alkachof/alkachof-web-v3-min/src',
    },
  },
  server: {
    allowedHosts: ['rosita-nonsynonymous-carmella.ngrok-free.dev']
  }
})
