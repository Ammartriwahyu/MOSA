
import { Hono } from "hono";
import { buildContainer } from "./composition-root.js";
import { loadEnv } from "./config/env.js";
import { createApp } from "./create-app.js";

const app: Hono = createApp(buildContainer(loadEnv(process.env)));

export default app;
