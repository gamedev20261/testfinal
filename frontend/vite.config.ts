import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(), // understands JSX and reloads components instantly when you save
    tailwindcss(), // turns the Tailwind classes we use into real CSS
  ],
  // The main bundle is ~220 KB gzipped (React, forms, dialogs); fine for this app, so no warning below 1 MB
  build: { chunkSizeWarningLimit: 1000 },
  server: {
    port: 5173,
    // Requests to /api go to the backend, so the browser only ever talks to one address
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
