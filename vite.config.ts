import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'dist',
    },
    server: {
        proxy: {
            // Forward /api requests to Express backend during development
            '/api': {
                target: 'http://localhost:5001',
                changeOrigin: true,
            },
            // Generated dream images are served off the Express side
            '/uploads': {
                target: 'http://localhost:5001',
                changeOrigin: true,
            }
        }
    }
})
