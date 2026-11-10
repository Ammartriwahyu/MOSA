import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

// Batas fitur (docs/03 §13): fitur hanya dipakai lewat index.ts-nya,
// dan shared/ tidak boleh bergantung pada fitur mana pun.
const featureBoundaries = {
  files: ["src/**/*.{ts,tsx}"],
  plugins: { boundaries },
  settings: {
    "import/resolver": {
      typescript: { alwaysTryTypes: true, project: "./tsconfig.json" },
    },
    "boundaries/legacy-templates": false,
    "boundaries/elements": [
      { type: "app", pattern: "src/app" },
      { type: "feature", pattern: "src/features/*", capture: ["featureName"] },
      { type: "shared", pattern: "src/shared/*", capture: ["sharedName"] },
    ],
  },
  rules: {
    "boundaries/dependencies": [
      2,
      {
        default: "allow",
        policies: [
          {
            from: { element: { type: "shared" } },
            disallow: { to: { element: { type: "feature" } } },
            message: "shared/ tidak boleh mengimpor features/.",
          },
          {
            from: { element: { type: "app" } },
            disallow: {
              to: { element: { type: "feature", fileInternalPath: "!index.ts" } },
            },
            message:
              "Impor fitur {{to.element.captured.featureName}} hanya lewat features/{{to.element.captured.featureName}}/index.ts.",
          },
          {
            from: { element: { type: "feature" } },
            disallow: {
              to: {
                element: {
                  type: "feature",
                  captured: { featureName: "!{{from.element.captured.featureName}}" },
                  fileInternalPath: "!index.ts",
                },
              },
            },
            message:
              "Impor fitur {{to.element.captured.featureName}} hanya lewat features/{{to.element.captured.featureName}}/index.ts.",
          },
        ],
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  featureBoundaries,
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
]);

export default eslintConfig;
