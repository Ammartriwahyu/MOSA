// Impor nilai (bukan `import type`) agar tetap ada setelah build: Vercel
// mendeteksi entri dari berkas yang mengimpor paket hono.
import { Hono } from "hono";
import { buildContainer } from "./composition-root";
import { loadEnv } from "./config/env";
import { createApp } from "./create-app";

// Entri Vercel: berkas di src/index.ts yang mengimpor paket hono dan
// mengekspor app sebagai default (https://vercel.com/docs/frameworks/backend/hono).
// App diekspor langsung, tidak dibungkus Hono lain: pembungkus memakai notFound
// bawaannya sendiri (teks polos), bukan format galat seragam.
const app: Hono = createApp(buildContainer(loadEnv(process.env)));

export default app;
