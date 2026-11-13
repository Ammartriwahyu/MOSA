import js from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

const SAME_MODULE = "{{from.element.captured.moduleName}}";
const OTHER_MODULE = `!${SAME_MODULE}`;
const ANY_PACKAGE = { module: { origin: ["external", "core"] } };

const layer = (name, moduleName) => ({
  element: { type: "layer", captured: moduleName ? { layer: name, moduleName } : { layer: name } },
});
const shared = (name) => ({ element: { type: "shared", captured: { layer: name } } });
// Berkas entri (src/*.ts) diklasifikasikan sebagai berkas, bukan elemen (pola elemen = folder).
const entry = { file: { categories: "entry" } };
const config = { element: { type: "config" } };

// Batas lapisan DDD (docs/03 §4). Kebijakan berupa larangan; selebihnya boleh.
const layerPolicies = [
  {
    // 1. domain (modul dan shared) murni: tanpa lapisan lain, tanpa pustaka, tanpa Node.
    from: [layer("domain"), shared("domain")],
    disallow: {
      to: [
        entry,
        config,
        layer(["application", "infrastructure", "interface"]),
        shared(["application", "infrastructure", "interface"]),
        ANY_PACKAGE,
      ],
    },
    message: "domain hanya boleh mengimpor domain modulnya sendiri dan shared/domain.",
  },
  {
    from: layer("domain"),
    disallow: { to: { element: { type: "layer", captured: { moduleName: OTHER_MODULE } } } },
    message: "domain tidak boleh mengimpor modul lain.",
  },
  {
    // 2. application: hanya domain + port miliknya.
    from: layer("application"),
    disallow: {
      to: [
        entry,
        config,
        layer(["infrastructure", "interface"]),
        { element: { type: "layer", captured: { moduleName: OTHER_MODULE } } },
        shared(["infrastructure", "interface"]),
        ANY_PACKAGE,
      ],
    },
    message: "application hanya boleh mengimpor domain dan port modulnya sendiri.",
  },
  {
    // 3. infrastructure: tidak menyentuh interface atau domain/infrastructure modul lain.
    from: layer("infrastructure"),
    disallow: {
      to: [
        entry,
        layer("interface"),
        shared("interface"),
        layer(["domain", "infrastructure"], OTHER_MODULE),
      ],
    },
    message: "infrastructure tidak boleh mengimpor interface atau domain/infrastructure modul lain.",
  },
  {
    // 4. interface: memanggil use case, tidak pernah infrastructure.
    from: layer("interface"),
    disallow: {
      to: [
        entry,
        layer("infrastructure"),
        shared("infrastructure"),
        layer("domain", OTHER_MODULE),
      ],
    },
    message: "interface hanya memanggil use case; tidak boleh mengimpor infrastructure.",
  },
  {
    // shared tidak bergantung pada modul mana pun atau titik masuk aplikasi.
    from: { element: { type: "shared" } },
    disallow: { to: [{ element: { type: "layer" } }, entry] },
    message: "shared/ tidak boleh mengimpor modules/ atau berkas entri.",
  },
  {
    // Lapisan di dalam shared/ mengikuti aturan yang sama dengan modul.
    from: shared("application"),
    disallow: { to: [config, shared(["infrastructure", "interface"]), ANY_PACKAGE] },
    message: "shared/application hanya boleh mengimpor shared/domain.",
  },
  {
    from: shared("infrastructure"),
    disallow: { to: [config, shared("interface")] },
    message: "shared/infrastructure tidak boleh mengimpor shared/interface atau config/.",
  },
  {
    from: shared("interface"),
    disallow: { to: [config, shared("infrastructure")] },
    message: "shared/interface tidak boleh mengimpor shared/infrastructure atau config/.",
  },
  {
    from: { element: { type: "config" } },
    disallow: { to: [{ element: { type: ["layer", "shared"] } }, entry] },
    message: "config/ hanya membaca environment.",
  },
];

export default defineConfig([
  globalIgnores(["node_modules/**", "coverage/**", "dist/**"]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    rules: {
      "no-console": ["error", { allow: ["error", "info"] }],
    },
  },
  {
    files: ["src/**/*.ts"],
    plugins: { boundaries },
    settings: {
      "import/resolver": {
        typescript: { alwaysTryTypes: true, project: "./tsconfig.json" },
      },
      "boundaries/legacy-templates": false,
      "boundaries/elements": [
        { type: "layer", pattern: "src/modules/*/*", capture: ["moduleName", "layer"] },
        { type: "shared", pattern: "src/shared/*", capture: ["layer"] },
        { type: "config", pattern: "src/config" },
      ],
      "boundaries/files": [{ pattern: "src/*.ts", category: "entry" }],
    },
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["**/frontend/**"], message: "Backend tidak boleh mengimpor frontend." }] }],
      "boundaries/dependencies": [
        2,
        { default: "allow", checkAllOrigins: true, policies: layerPolicies },
      ],
    },
  },
]);
