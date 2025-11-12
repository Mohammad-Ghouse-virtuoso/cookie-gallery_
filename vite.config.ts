/// <reference types="vitest" />

import { defineConfig, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { imagetools } from 'vite-imagetools'
import tailwindcss from '@tailwindcss/vite'; 
import path from 'path';
import type { UserConfig as VitestUserConfig } from 'vitest/config';

// https://vite.dev/config/
const config: UserConfig & { test: VitestUserConfig['test'] } = {
  plugins: [react(), tailwindcss(), imagetools()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    mockReset: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'vendor-stripe': ['@stripe/react-stripe-js', '@stripe/stripe-js'],
          'vendor-ui': ['framer-motion', 'swiper'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    minify: 'esbuild',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
};

export default defineConfig(config);
