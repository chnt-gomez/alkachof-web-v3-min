import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Busts the persisted query cache on every build.
 *
 * A row dehydrated by one build is rehydrated by the next with **no validation**,
 * so a cached type that gains or loses a field would surface as a runtime error on
 * a user's device, on the boot path. A hand-maintained version constant only works
 * if every future author remembers to bump it; deriving it from the build makes
 * that impossible to forget. The cost is dropping the persisted cache on each
 * deploy, which is far rarer than a session.
 *
 * Swap this for the git short sha if reproducible builds ever matter — it needs
 * `.git` present wherever the build runs.
 */
const CACHE_BUSTER = Date.now().toString()

export default defineConfig({
  define: { __CACHE_BUSTER__: JSON.stringify(CACHE_BUSTER) },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    allowedHosts: ['app.alkachof.mx']
  }
})
