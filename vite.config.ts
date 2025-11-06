import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Security headers plugin for development
    {
      name: 'security-headers',
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          // Content Security Policy
          res.setHeader(
            'Content-Security-Policy',
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.cloudfunctions.net https://firestore.googleapis.com wss://*.firebaseio.com ws://localhost:*; frame-src 'self' https://*.firebaseapp.com; object-src 'none'; base-uri 'self';"
          );
          // X-Content-Type-Options
          res.setHeader('X-Content-Type-Options', 'nosniff');
          // X-Frame-Options
          res.setHeader('X-Frame-Options', 'DENY');
          // X-XSS-Protection
          res.setHeader('X-XSS-Protection', '1; mode=block');
          // Referrer-Policy
          res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
