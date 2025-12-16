import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Use root path since the site is served from a custom domain (fueltrics.com) at the origin root.
  base: '/',
  plugins: [react()],
  build: {
    outDir: 'docs',
  },
})
