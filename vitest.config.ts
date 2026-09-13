import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Fixed under test so a blob seeded by a test is not busted by the clock, and
  // so no assertion can depend on the machine's git state. Tests that exercise
  // busting write a different value into the blob itself.
  define: {
    __CACHE_BUSTER__: JSON.stringify('test'),
    __APP_VERSION__: JSON.stringify('0.0.0-test'),
    __BUILD_SHA__: JSON.stringify('testsha'),
    __BUILD_TIME__: JSON.stringify('1970-01-01T00:00:00.000Z'),
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
