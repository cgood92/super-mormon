import { defineConfig } from "vite";
export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  server: { hmr: false },
  build: {
    manifest: "scene-manifest.json",
    rollupOptions: {
      input: {
        game: "index.html",
        cast: "tools/cast/index.html",
      },
      output: { manualChunks: { three: ["three"] } },
    },
  },
});
