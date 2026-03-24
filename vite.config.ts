import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Las variables VITE_* en .env se exponen automáticamente a través de import.meta.env.
// GEMINI_API_KEY NO tiene prefijo VITE_ para que nunca llegue al bundle del cliente;
// se inyecta exclusivamente en el Cloudflare Worker (functions/api/gemini.js).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    // Proxy local para desarrollo: redirige /api/gemini al worker de Cloudflare
    // Si usas `wrangler pages dev` localmente, este proxy no es necesario.
    // proxy: {
    //   '/api': 'http://localhost:8788',
    // },
  },
});
