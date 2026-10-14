import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".tmp/**",
      "src/generated/**",
      "next-env.d.ts",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["scripts/**", "tests/**"],
    rules: { "no-console": "off" },
  },
];

export default config;
