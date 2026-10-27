import { defineConfig } from "vite";

// base "./" keeps asset paths relative, so the built game also works from a
// GitHub Pages sub-path like https://you.github.io/storytrail/
export default defineConfig({
  base: "./",
  build: { target: "es2020" },
  test: { environment: "jsdom", include: ["tests/**/*.test.js"], restoreMocks: true },
});
