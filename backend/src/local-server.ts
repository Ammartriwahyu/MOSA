import { serve } from "@hono/node-server";
import { loadEnv } from "./config/env.js";
import app from "./index.js";

const { PORT } = loadEnv(process.env);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.info(`Backend berjalan di http://localhost:${info.port}`);
});
