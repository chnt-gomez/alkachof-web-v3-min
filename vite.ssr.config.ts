import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Builds `src/prerender/entry-server.tsx` into a Node-runnable bundle for
 * `scripts/prerender.mjs`. Run by `npm run build`, after the client build.
 *
 * Deliberately **not** the main config:
 *
 * - The `alkachof-version` plugin emits `version.json` through `generateBundle`,
 *   which would drop a second copy into `dist-ssr/` that nothing serves.
 * - `manualChunks` describes how to split a browser bundle across network
 *   requests. An SSR bundle is `import`ed once from disk by one Node process.
 *
 * It is a separate *build* rather than Vite's `ssrLoadModule` because
 * `react-router-dom` ships CommonJS: loaded through the module runner its named
 * exports are not resolvable, and inlining it instead trips over `module is not
 * defined`. Rollup handles the interop correctly, so bundling sidesteps the
 * whole class of problem.
 */
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    ssr: 'src/prerender/entry-server.tsx',
    outDir: 'dist-ssr',
    emptyOutDir: true,
  },
})
