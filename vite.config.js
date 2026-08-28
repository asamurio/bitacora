import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5858,
    proxy: {
      '/api': 'http://localhost:3456'
    }
  }
})
