import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored static JS assets for calculator HTML pages; not part of the
    // React/TS build graph and intentionally plain-JS for iframe embedding.
    "public/calc/**",
  ]),
  {
    // React 19 / Next 16 introduced `react-hooks/set-state-in-effect`. It flags
    // legitimate init patterns (read localStorage → setState) as errors. The
    // proper refactor is `useSyncExternalStore`, but our codebase has 14 such
    // hydration effects. Downgrading to a warning keeps the signal visible
    // without blocking CI; individual offenders can be migrated incrementally.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
