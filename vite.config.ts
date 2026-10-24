import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  // Electron loads production assets through file://, so URLs must be relative.
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react(),
    tsconfigPaths()
  ],
  optimizeDeps: {
    exclude: ['@mediapipe/pose']
  }
})
