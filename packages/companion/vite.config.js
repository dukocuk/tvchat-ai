import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // bind to 0.0.0.0 so phone on same WiFi can reach the dev server
    port: 5174,
  },
});
