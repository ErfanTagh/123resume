import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
    proxy: {
      // DEV SERVER ONLY - This proxy config is NOT used in production builds
      // Production uses VITE_API_URL env var set at build time (see docker-compose.prod.yml)
      // Proxy API requests to backend in development
      '/api': {
        // Default: backend on the host (docker compose maps 8000:8000, or runserver on machine).
        // In Docker Compose, set VITE_BACKEND_URL=http://backend:8000 on the frontend service.
        target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['react-pdftotext', 'react-pdf', 'react-i18next', 'i18next', 'i18next-browser-languagedetector'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    commonjsOptions: {
      include: [/react-pdftotext/, /node_modules/],
    },
  },
}));
