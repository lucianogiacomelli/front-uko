import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Expone el servidor en la red local (0.0.0.0) para probar desde celulares y otros equipos
  server: { host: true },
  preview: { host: true },
})
