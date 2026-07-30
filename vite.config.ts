import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages project sites are served from /<repo>/, so assets need that
// prefix. Override with BASE_PATH=/ if you ever move to a custom domain.
const base = process.env.BASE_PATH ?? '/dateideas/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
})
