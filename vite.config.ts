import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Use repository path so GitHub Pages assets resolve correctly at /FuelSensex/.
  base: '/FuelSensex/',
  plugins: [react()],
  build: {
    outDir: 'docs',
  },
})
