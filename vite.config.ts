import { defineConfig } from "vite";
export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  server: { hmr: false },
  build: {
    rollupOptions: {
      input: {
        game: "index.html",
        styles: "lehi-styles.html",
        play: "lehi-play.html",
      },
      output: { manualChunks: { three: ["three"] } },
    },
  },
});
