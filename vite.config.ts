import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative base so the built site also works when opened from disk or any sub-folder.
  base: './',
  build: {
    // three.js makes the globe chunk large; it is lazy-loaded with that one lesson.
    chunkSizeWarningLimit: 1100,
  },
})
