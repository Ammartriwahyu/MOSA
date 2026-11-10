import { Hono } from "hono";

// Pembacaan ringan ke database (keep-alive Supabase) ditambahkan di P03.
export const healthRoutes = new Hono().get("/health", (c) => c.json({ status: "ok" }));
