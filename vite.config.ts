import { defineConfig } from "vite";
export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  server: { hmr: false },
  build: { rollupOptions: { output: { manualChunks: { three: ["three"] } } } },
});
