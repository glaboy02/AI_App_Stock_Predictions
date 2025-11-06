import { defineConfig } from 'vite'

export default defineConfig({
  // Base public path when served in development or production
  base: './',
  
  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Ensure assets are properly referenced
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  
  // Development server configuration
  server: {
    port: 5173,
    host: true
  }
})