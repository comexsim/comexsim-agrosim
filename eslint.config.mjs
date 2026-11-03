import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  // Los prototipos de estilo son HTML desechables, fuera del producto.
  { ignores: [".next", "node_modules", "next-env.d.ts", "prototypes"] },
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
];

export default config;
