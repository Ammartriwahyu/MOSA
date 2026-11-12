import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Beberapa mesin PostgreSQL WASM yang cold-start bersamaan membuat impor
    // entri melewati 5 dtk. Satu pekerja menserialkan berkas, tanpa menaikkan
    // timeout, retry, atau menonaktifkan isolasi antarberkas.
    maxWorkers: 1,
    include: ["tests/**/*.test.ts"],
    // Zona waktu mesin sengaja bukan UTC dan bukan WIB: membuktikan helper WIB
    // tidak bergantung pada zona waktu server (docs/05 kasus batas waktu).
    env: { TZ: "America/New_York" },
  },
});
