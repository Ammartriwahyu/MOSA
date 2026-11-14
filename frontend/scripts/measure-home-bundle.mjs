import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { JSDOM } from "jsdom";

const cwd = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(join(cwd, "package.json"));
const reservation = createServer();
await new Promise((resolve, reject) => { reservation.once("error", reject); reservation.listen(0, "127.0.0.1", resolve); });
const address = reservation.address();
if (!address || typeof address === "string") throw new Error("Port lokal tidak tersedia.");
const port = address.port;
await new Promise((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
const origin = `http://127.0.0.1:${port}`;
const started = performance.now();
const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], { cwd, stdio: "ignore", windowsHide: true });
let spawnFailed = false;
child.once("error", () => { spawnFailed = true; });
let report;

try {
  let html;
  const deadline = started + 30_000;
  while (!html && performance.now() < deadline) {
    if (spawnFailed || child.exitCode !== null) throw new Error("Server produksi gagal; jalankan build terlebih dahulu.");
    try {
      const response = await fetch(origin, { headers: { "Accept-Encoding": "identity" }, signal: AbortSignal.timeout(2_000), redirect: "manual" });
      if (response.status !== 200) throw new Error("Halaman utama bukan HTTP 200.");
      html = await response.text();
    } catch { await new Promise((resolve) => setTimeout(resolve, 100)); }
  }
  if (!html) throw new Error("Server produksi belum siap pada batas waktu.");
  const readyMs = Math.round((performance.now() - started) * 100) / 100;

  const dom = new JSDOM(html, { url: origin });
  try {
    const scripts = [...new Set([...dom.window.document.querySelectorAll("script[src]:not([nomodule])")].map((element) => element.getAttribute("src")))];
    const nomodule = [...new Set([...dom.window.document.querySelectorAll("script[src][nomodule]")].map((element) => element.getAttribute("src")))];
    const styles = [...new Set([...dom.window.document.querySelectorAll('link[rel="stylesheet"][href]')].map((element) => element.getAttribute("href")))];
    if (!scripts.length || !styles.length) throw new Error("Aset HTML tidak lengkap; ukuran nol tidak dianggap sukses.");
    async function sizes(paths) {
      let rawBytes = 0; let gzipBytes = 0;
      for (const path of paths) {
        const url = new URL(path, origin);
        if (url.origin !== origin || !url.pathname.startsWith("/_next/static/")) throw new Error("Aset di luar localhost ditolak.");
        const response = await fetch(url, { headers: { "Accept-Encoding": "identity" }, signal: AbortSignal.timeout(5_000) });
        if (!response.ok) throw new Error("Aset produksi gagal diambil.");
        const bytes = Buffer.from(await response.arrayBuffer());
        rawBytes += bytes.length; gzipBytes += gzipSync(bytes).length;
      }
      return { files: paths.length, rawBytes, gzipBytes };
    }
    report = { node: process.version, scope: "HTML / on fresh local production server, unique modern initial script/CSS URLs; nomodule reported separately; gzip estimated per file; excludes lazy chunks/fonts/HTML/RSC", frontendReadyMs: readyMs,
      javascript: await sizes(scripts), nomoduleJavascript: await sizes(nomodule), css: await sizes(styles) };
  } finally { dom.window.close(); }
} catch {
  process.stderr.write("Pengukuran bundle gagal; pastikan build produksi tersedia. Tidak menerbitkan ukuran sukses.\n");
  process.exitCode = 1;
} finally {
  if (child.exitCode === null && !spawnFailed) {
    child.kill();
    await once(child, "close", { signal: AbortSignal.timeout(5_000) });
  }
}
if (report && !process.exitCode) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
