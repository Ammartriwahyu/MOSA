import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PUSH } from "../src/shared/copy/copy.ts";

const source = readFileSync(new URL("../src/features/reminders/worker/sw.template.js", import.meta.url), "utf8");
const output = source.replace("/*__PUSH_COPY__*/ null", JSON.stringify({ title: PUSH.notificationTitle, body: PUSH.notificationBody }));
const target = new URL("../public/sw.js", import.meta.url);
if (process.argv.includes("--check")) {
  if (readFileSync(target, "utf8").replace(/\r\n/g, "\n") !== output.replace(/\r\n/g, "\n")) {
    throw new Error("Regenerate public/sw.js with node scripts/generate-service-worker.mjs");
  }
} else {
  mkdirSync(new URL("../public/", import.meta.url), { recursive: true });
  writeFileSync(fileURLToPath(target), output);
}
