import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config({ path: '.env' });

export default defineConfig({
  plugins: [react()],

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/lib/__tests__/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/lib/__tests__/**',
        'src/app/**',
        '**/*.config.ts',
        '**/node_modules/**',
      ],
    },
  },

  resolve: {
    alias: {
      '@': '/src',
    },
  },
});