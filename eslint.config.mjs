import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "src/lib/data/us-map.json"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // End-to-end scripts run straight under Node, so they load modules with require().
  { files: ["e2e/**/*.cjs"], rules: { "@typescript-eslint/no-require-imports": "off" } },
];

export default config;
