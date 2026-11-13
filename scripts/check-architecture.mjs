import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// lintText memakai konfigurasi dan path berkas asli tanpa menulis probe ke src.
// Kasus positif mencegah pemeriksaan yang memblokir seluruh impor ikut dianggap lulus.
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const probes = {
  backend: [
    ["domain → application", "src/modules/medication/domain/medicine.ts", "../../../shared/application/logger", false],
    ["domain → infrastructure", "src/modules/medication/domain/medicine.ts", "../../../shared/infrastructure/system-clock", false],
    ["domain → Node", "src/modules/medication/domain/medicine.ts", "node:crypto", false],
    ["domain → zod", "src/modules/medication/domain/medicine.ts", "zod", false],
    ["domain → domain modul lain", "src/modules/medication/domain/medicine.ts", "../../dosing/domain/next-dose", false],
    ["application → infrastructure", "src/modules/medication/application/explain-medicine-text.use-case.ts", "../infrastructure/supabase-medicine.repository", false],
    ["application → modul lain", "src/modules/medication/application/explain-medicine-text.use-case.ts", "../../dosing/application/get-scan-context.use-case", false],
    ["infrastructure → domain modul lain", "src/modules/medication/infrastructure/supabase-medicine.repository.ts", "../../dosing/domain/next-dose", false],
    ["infrastructure → infrastructure modul lain", "src/modules/medication/infrastructure/supabase-medicine.repository.ts", "../../dosing/infrastructure/supabase-dosing-medicine-reader", false],
    ["interface → infrastructure", "src/modules/medication/interface/medication.routes.ts", "../infrastructure/supabase-medicine.repository", false],
    ["shared → modul", "src/shared/interface/parse-json-body.ts", "../../modules/medication/domain/medicine", false],
    ["config → aplikasi", "src/config/env.ts", "../shared/domain/result", false],
    ["domain → shared/domain", "src/modules/medication/domain/medicine.ts", "../../../shared/domain/result", true],
    ["application → domain sendiri", "src/modules/medication/application/explain-medicine-text.use-case.ts", "../domain/medicine", true],
    ["interface → application sendiri", "src/modules/medication/interface/medication.routes.ts", "../application/explain-medicine-text.use-case", true],
    ["infrastructure → port modul lain", "src/modules/medication/infrastructure/supabase-medicine.repository.ts", "../../dosing/application/ports/medicine-schedule-reader", true],
    ["backend → frontend", "src/create-app.ts", "../../frontend/src/shared/config/routes", false, "no-restricted-imports"],
  ],
  frontend: [
    ["app → fitur internal", "src/app/providers.tsx", "@/features/auth/hooks/use-household", false],
    ["shared → fitur", "src/shared/ui/button.tsx", "@/features/auth", false],
    ["fitur → internal fitur lain", "src/features/scan/hooks/use-scan-request.ts", "@/features/medicines/api/medicines", false],
    ["app → index fitur", "src/app/providers.tsx", "@/features/auth", true],
    ["fitur → index fitur lain", "src/features/scan/hooks/use-scan-request.ts", "@/features/medicines", true],
    ["shared → shared", "src/shared/ui/button.tsx", "@/shared/config", true],
    ["frontend → backend", "src/app/providers.tsx", "../../../backend/src/shared/domain/result", false, "no-restricted-imports"],
  ],
};

let failed = false;
const selectedPackage = process.argv[2];
if (selectedPackage && !Object.hasOwn(probes, selectedPackage)) throw new Error("Paket probe tidak dikenal.");
for (const [name, cases] of Object.entries(probes)) {
  if (!selectedPackage) {
    // Resolver menyimpan cache project. Dua proses menjaga konfigurasi backend
    // dan alias frontend terisolasi sebagaimana perintah lint masing-masing.
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), name], { cwd: join(root, name), stdio: "inherit" });
    failed ||= result.status !== 0;
    continue;
  }
  if (selectedPackage !== name) continue;
  const cwd = join(root, name);
  // Resolver TypeScript membaca project relatif terhadap cwd proses, sama
  // seperti pnpm --filter <paket> lint. Jangan menguji alias dari cwd akar.
  process.chdir(cwd);
  const require = createRequire(join(cwd, "package.json"));
  const ts = require("typescript");
  const config = ts.readConfigFile(join(cwd, "tsconfig.json"), ts.sys.readFile);
  if (config.error) throw new Error(`Konfigurasi TypeScript ${name} tidak terbaca.`);
  const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, cwd);
  const { ESLint } = await import(pathToFileURL(require.resolve("eslint")).href);
  const eslint = new ESLint({ cwd, fix: false });
  const failures = [];
  for (const [label, file, specifier, allowed, expectedRule = "boundaries/dependencies"] of cases) {
    const source = join(cwd, file);
    if (!existsSync(source) || (!specifier.startsWith("node:") && !ts.resolveModuleName(specifier, source, options, ts.sys).resolvedModule)) {
      for (const typeOnly of [false, true]) failures.push({ label, typeOnly, reason: "Path probe tidak dapat di-resolve; hasil tidak dianggap lulus." });
      continue;
    }
    for (const typeOnly of [false, true]) {
      const code = typeOnly
        ? `import type * as Dependency from "${specifier}"; export type Probe = typeof Dependency;`
        : `import * as dependency from "${specifier}"; export { dependency };`;
      const results = await eslint.lintText(code, { filePath: join(cwd, file), warnIgnored: true });
      const messages = results.flatMap((result) => result.messages);
      const rules = messages.map((message) => message.ruleId);
      // Parser errors, ignored paths, and unrelated failures cannot masquerade
      // as enforcement of the requested architecture rule.
      const passed = results.length === 1 && (allowed ? messages.length === 0 : rules.includes(expectedRule) && rules.every((rule) => rule === expectedRule));
      if (!passed) failures.push({ label, typeOnly, allowed, expectedRule, actualRules: rules });
    }
  }
  failed ||= failures.length > 0;
  process.stdout.write(`${JSON.stringify({ package: name, probes: cases.length * 2, passed: cases.length * 2 - failures.length, failures })}\n`);
  process.chdir(root);
}
if (failed) process.exitCode = 1;
