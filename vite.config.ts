import { defineConfig } from "vite";
export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  server: { hmr: false },
  build: {
    manifest: "scene-manifest.json",
    rolldownOptions: {
      input: {
        game: "index.html",
        cast: "tools/cast/index.html",
      },
      output: {
        codeSplitting: {
          groups: [{ name: "three", test: /[\\/]node_modules[\\/]three[\\/]/ }],
        },
      },
    },
  },
});
