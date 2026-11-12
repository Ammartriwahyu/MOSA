import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

function runCommand(url: string) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((done, reject) => {
    const processUnderTest = spawn(process.execPath, ["--import", "tsx", "scripts/check-rls.ts"], {
      cwd: resolve(import.meta.dirname, "../.."),
      env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-key-fiktif-tidak-untuk-log" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = ""; let stderr = "";
    processUnderTest.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    processUnderTest.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    processUnderTest.on("error", reject);
    processUnderTest.on("close", (code) => done({ code, stdout, stderr }));
  });
}

describe("perintah db:check-rls melalui HTTP lokal fiktif", () => {
  test.each([
    { status: 401, body: { code: "42501", message: "Pesan privat uji" }, exit: 0 },
    { status: 503, body: { code: "PGRST000", message: "Pesan privat uji" }, exit: 1 },
    { status: 401, body: { message: "Invalid API key" }, exit: 1 },
  ])("HTTP $status/$exit menghasilkan exit yang benar, tanpa membocorkan body/kunci", async ({ status, body, exit }) => {
    const requests: string[] = [];
    const server = createServer((request, response) => {
      requests.push(`${request.method} ${request.url}`);
      response.writeHead(status, { "Content-Type": "application/json" }); response.end(JSON.stringify(body));
    });
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Port uji tidak tersedia.");
      const result = await runCommand(`http://127.0.0.1:${address.port}`);
      expect(result.code, result.stderr).toBe(exit); expect(requests).toHaveLength(12);
      expect(requests.filter((request) => request.startsWith("GET "))).toHaveLength(6);
      expect(requests.filter((request) => request.startsWith("POST "))).toHaveLength(6);
      const output = result.stdout + result.stderr;
      expect(output).not.toMatch(/public-key-fiktif|Pesan privat uji|Invalid API key/);
      if (exit === 0) expect(output).toContain("RLS OK");
      else { expect(output).toContain("RLS BELUM TERBUKTI"); expect(output).not.toContain("RLS OK"); }
    } finally {
      server.closeAllConnections(); await new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done()));
    }
  });
});
