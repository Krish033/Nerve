import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
  ]),
  {
    rules: {
      // Disallow console.log in committed code (use lib/logger.ts instead)
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // Discourage any — use proper types or unknown
      "@typescript-eslint/no-explicit-any": "warn",

      // Catch missing deps in hooks
      "react-hooks/exhaustive-deps": "warn",

      // Prefer const
      "prefer-const": "error",

      // No unused variables (TypeScript already enforces this but be explicit)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
