import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Zona waktu mesin sengaja bukan UTC dan bukan WIB: membuktikan helper WIB
    // tidak bergantung pada zona waktu server (docs/05 kasus batas waktu).
    env: { TZ: "America/New_York" },
  },
});
