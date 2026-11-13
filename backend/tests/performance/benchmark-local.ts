import { spawnSync } from "node:child_process";
import { cpus, totalmem } from "node:os";
import { fileURLToPath } from "node:url";
import { summarizeDurations } from "./measurements";

// Tool lokal saja, tidak masuk src/ atau CI timing assertions. Tidak memuat .env.
const backendDir = fileURLToPath(new URL("../../", import.meta.url));
const script = fileURLToPath(import.meta.url);
const warmup = 5;
const samples = 30;

async function coldEntry() {
  const started = performance.now();
  const { default: app } = await import("../../src/index");
  if (typeof app.fetch !== "function") throw new Error("Entri backend tidak mengekspor app.");
  process.stdout.write(JSON.stringify({ entryImportMs: performance.now() - started }));
}

async function benchmark() {
  // Jangan mewariskan kredensial/proyek AI dari shell ke probe entri produksi.
  const env: NodeJS.ProcessEnv = {};
  for (const key of ["PATH", "Path", "SystemRoot", "WINDIR", "TEMP", "TMP", "LOCALAPPDATA", "USERPROFILE"]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  Object.assign(env, { NODE_ENV: "test", FRONTEND_ORIGIN: "http://127.0.0.1:1", SUPABASE_URL: "http://127.0.0.1:1",
    SUPABASE_SECRET_KEY: "fixture-key-not-production", GEMINI_API_KEY: "fixture-ai-key", GEMINI_MODEL: "fixture-model",
    SCAN_TOKEN_SECRET: "benchmark-only-secret-never-for-production", AI_DAILY_LIMIT: "20" });
  const imports: number[] = []; const processWalls: number[] = [];
  for (let index = 0; index < 5; index++) {
    const started = performance.now();
    const child = spawnSync(process.execPath, ["--import", "tsx", script, "--cold-entry"], { cwd: backendDir, env, encoding: "utf8", timeout: 15_000, windowsHide: true });
    if (child.status !== 0) throw new Error("Probe entri gagal; keluaran konfigurasi tidak dicetak.");
    const value: unknown = JSON.parse(child.stdout);
    if (!value || typeof value !== "object" || !("entryImportMs" in value) || typeof value.entryImportMs !== "number") throw new Error("Hasil probe entri tidak valid.");
    imports.push(value.entryImportMs); processWalls.push(performance.now() - started);
  }
  const setupStarted = performance.now();
  const { e2eSystem } = await import("../support/e2e-system");
  const system = await e2eSystem();
  const setupMs = performance.now() - setupStarted;
  try {
    const { token } = await system.register("benchmark@example.invalid");
    async function request(path: string, method = "GET", body?: unknown, status = 200) {
      const response = await fetch(`${system.origin}${path}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(5_000) });
      const value: unknown = await response.json();
      if (response.status !== status || system.transport.failures.length) throw new Error(`Kontrak benchmark HTTP gagal (${response.status}/${status}).`);
      return value;
    }
    await request("/v1/household/consents", "POST", { kind: "data" });
    const medicine = await request("/v1/medicines", "POST", { name: "Obat Fiktif Benchmark", strength: "5 mg", purpose: "Kegunaan fiktif", doseAmount: "1 tablet", usageRule: "Sesudah makan", warnings: "Tidak ada larangan khusus", notes: null,
      intakeTimes: ["07:00", "19:00"], labelSource: "keluarga", explanationOrigin: "teks_pengisi", explanation: null }, 201);
    if (!medicine || typeof medicine !== "object" || !("id" in medicine) || typeof medicine.id !== "string") throw new Error("Fixture obat gagal dibuat.");
    system.setNow("2026-11-12T00:30:00Z");
    const api = [];
    for (const path of ["/v1/health", "/v1/medicines", "/v1/doses/today"]) {
      const timings = [];
      for (let index = 0; index < warmup + samples; index++) {
        const started = performance.now(); await request(path); const elapsed = performance.now() - started;
        if (index >= warmup) timings.push(elapsed);
      }
      api.push({ method: "GET", route: path, status: 200, ...summarizeDurations(timings) });
    }
    const confirmations = [];
    for (let index = 0; index < warmup + samples; index++) {
      // Satu slot baru per hari fiktif: setiap sampel mengukur 201, bukan replay 409.
      const date = new Date(Date.UTC(2026, 10, 12 + index)).toISOString().slice(0, 10);
      system.setNow(`${date}T00:30:00Z`);
      const slot = `${medicine.id}:${date.replaceAll("-", "")}:0700`;
      const started = performance.now(); await request(`/v1/doses/${encodeURIComponent(slot)}/confirm`, "POST", { mode: "basic" }, 201);
      if (index >= warmup) confirmations.push(performance.now() - started);
    }
    api.push({ method: "POST", route: "/v1/doses/:slotId/confirm (basic)", status: 201, ...summarizeDurations(confirmations) });
    return { node: process.version, platform: process.platform, cpuCount: cpus().length, memoryGiB: Math.round(totalmem() / 2 ** 30),
      scope: "Hono HTTP + production adapters + in-memory PGlite; Auth/PostgREST/AI fixture; one SQL connection; not deployed latency", warmup,
      coldEntry: { samples: 5, importAndConstruction: summarizeDurations(imports), wholeProcess: summarizeDurations(processWalls), fixtureSetupMs: Math.round(setupMs * 100) / 100 }, api };
  } finally { await system.close(); }
}

// Entri impor saja: tidak ada permintaan jaringan dari mode ini.
if (process.argv.includes("--cold-entry")) await coldEntry();
else await benchmark().then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
  .catch(() => { process.stderr.write("Benchmark gagal; tidak menerbitkan hasil sukses atau isi respons.\n"); process.exitCode = 1; });
