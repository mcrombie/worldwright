import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Standalone browser build — renderer only, no Electron.
// Usage: vite build --config vite.browser.config.ts --mode browser
export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  envDir: __dirname,
  base: '/azhora-map/',
  resolve: {
    alias: { '@renderer': resolve(__dirname, 'src/renderer/src') }
  },
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, 'out/browser'),
    emptyOutDir: true,
  },
})
