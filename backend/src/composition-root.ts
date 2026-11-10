import type { Env } from "./config/env";

// Satu-satunya tempat merakit repository, adaptor, dan use case (docs/03 §4).
// Modul didaftarkan di sini mulai P03.
export type Container = {
  frontendOrigin: string;
};

export function buildContainer(env: Env): Container {
  return { frontendOrigin: env.FRONTEND_ORIGIN };
}
