import { Hono } from "hono";
import { buildContainer } from "./composition-root";
import { loadEnv } from "./config/env";
import { createApp } from "./create-app";

// Entri Vercel: berkas di src/index.ts yang mengimpor paket hono dan
// mengekspor app sebagai default (https://vercel.com/docs/frameworks/backend/hono).
const app = new Hono().route("/", createApp(buildContainer(loadEnv(process.env))));

export default app;
