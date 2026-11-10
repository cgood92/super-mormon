import { defineConfig } from "vite";
import { adminDevPlugin } from "./src/dev/admin-plugin";

const base = process.env.VITE_BASE_PATH || "/";

export default defineConfig({
  base,
  server: { hmr: false },
  plugins: [adminDevPlugin(base)],
  build: {
    manifest: "scene-manifest.json",
    rolldownOptions: {
      input: {
        game: "index.html",
        cast: "tools/cast/index.html",
        roster: "roster.html",
        variety: "variety.html",
        mormon: "mormon.html",
        kartRoster: "kart-roster.html",
      },
      output: {
        codeSplitting: {
          groups: [{ name: "three", test: /[\\/]node_modules[\\/]three[\\/]/ }],
        },
      },
    },
  },
});
