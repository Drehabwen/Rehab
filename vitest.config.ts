import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
    // desktop/*.test.cjs 用 node --test 运行（见 npm run test:desktop），不交给 vitest
    exclude: [...configDefaults.exclude, '**/.worktrees/**', 'desktop/**/*.test.cjs'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
