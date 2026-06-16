import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['chrome >= 47'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
    }),
  ],
  build: {
    outDir: 'dist',
    // Single chunk for Tizen — no dynamic imports on M47
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  // Relay URL injected at build time; override with .env.local
  define: {
    'import.meta.env.VITE_RELAY_URL': JSON.stringify(
      process.env.VITE_RELAY_URL || 'wss://clautv-relay.onrender.com'
    ),
    'import.meta.env.VITE_COMPANION_URL': JSON.stringify(
      process.env.VITE_COMPANION_URL || 'https://companion.clautv.ai'
    ),
  },
});
