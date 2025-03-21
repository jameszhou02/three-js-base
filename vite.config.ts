import { defineConfig } from "vite";

export default defineConfig({
  publicDir: "public",
  base: "./",
  server: {
    open: true,
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "cannon-es": ["cannon-es"],
        },
      },
    },
  },
  worker: {
    format: "es",
  },
});
