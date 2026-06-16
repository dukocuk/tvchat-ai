import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_RELAY_URL': JSON.stringify(
      process.env.VITE_RELAY_URL || 'wss://clautv-relay.onrender.com'
    ),
  },
});
