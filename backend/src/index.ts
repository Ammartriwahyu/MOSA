
import { Hono } from "hono";
import { buildContainer } from "./composition-root";
import { loadEnv } from "./config/env";
import { createApp } from "./create-app";

const app: Hono = createApp(buildContainer(loadEnv(process.env)));

export default app;
