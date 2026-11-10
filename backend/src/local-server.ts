import { serve } from "@hono/node-server";
import { loadEnv } from "./config/env";
import app from "./index";

// Server Node untuk localhost (pengembangan dan Grand Final). Produksi memakai src/index.ts.
const { PORT } = loadEnv(process.env);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.info(`Backend berjalan di http://localhost:${info.port}`);
});
