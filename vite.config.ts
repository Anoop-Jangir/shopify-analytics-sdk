import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "./src/analytics.ts",
      name: "Analytics",
      fileName: (format) => "analytics.js",
      formats: ["iife"]
    },

    minify: false,

    emptyOutDir: true
  }
});