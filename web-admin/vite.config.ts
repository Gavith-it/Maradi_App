import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Output to repo root /dist so Vercel finds it when building from web-admin
    outDir: '../dist',
  },
})
