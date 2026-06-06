// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env' });

export default defineConfig({
  plugins: [react()],

  test: {
    globals: true,
    environment: 'node',           // ← Important pour Prisma
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '.next/**'],
    
    setupFiles: ['./src/lib/__tests__/setup.ts'],
    
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
      '@': path.resolve(__dirname, './src'),   // ← Correction importante
    },
  },
});