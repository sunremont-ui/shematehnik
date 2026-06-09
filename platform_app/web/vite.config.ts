/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",                 // относительные пути → работает на любом subpath (GitHub Pages)
  server: { port: 5173, open: true },
  test: {
    // только unit-тесты Vitest; e2e (*.spec.ts в e2e/) гоняет Playwright
    include: ["src/**/*.test.ts"],
  },
});
