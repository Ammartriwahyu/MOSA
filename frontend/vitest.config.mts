import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Alias "@/*" dibaca langsung dari tsconfig.json (fitur bawaan Vite).
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    // Berbagi sumber daya dengan suite backend pada pnpm test dari akar.
    maxWorkers: "25%",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
