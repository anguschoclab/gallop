import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import jsdoc from "eslint-plugin-jsdoc";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi", "*.gen.ts"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      jsdoc,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Apply JSDoc rules only to TypeScript files, not TSX components
  {
    files: ["**/*.ts"],
    rules: {
      "jsdoc/require-jsdoc": [
        "error",
        {
          contexts: ["FunctionDeclaration", "FunctionExpression", "TSDeclareFunction"],
          publicOnly: true,
          enableFixer: false,
        },
      ],
      "jsdoc/require-param": "error",
      "jsdoc/require-returns": "error",
    },
  },
  // Exclude React components from JSDoc requirements
  {
    files: ["**/*.tsx"],
    rules: {
      "jsdoc/require-jsdoc": "off",
      "jsdoc/require-param": "off",
      "jsdoc/require-returns": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Exclude test files
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/__tests__/**/*.ts", "**/__tests__/**/*.tsx"],
    rules: {
      "jsdoc/require-jsdoc": "off",
      "jsdoc/require-param": "off",
      "jsdoc/require-returns": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Exclude generated files
  {
    files: ["**/*.gen.ts", "**/routeTree.gen.ts"],
    rules: {
      "jsdoc/require-jsdoc": "off",
      "jsdoc/require-param": "off",
      "jsdoc/require-returns": "off",
    },
  },
  // Exclude scripts (one-off analysis tools)
  {
    files: ["scripts/**/*.ts"],
    rules: {
      "jsdoc/require-jsdoc": "off",
      "jsdoc/require-param": "off",
      "jsdoc/require-returns": "off",
    },
  },
  // Exclude workers (Web Workers have different patterns)
  {
    files: ["src/workers/**/*.ts"],
    rules: {
      "jsdoc/require-jsdoc": "off",
      "jsdoc/require-param": "off",
      "jsdoc/require-returns": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Exclude config files
  {
    files: ["vitest.config.ts", "vite.config.ts", "tsconfig.json"],
    rules: {
      "jsdoc/require-jsdoc": "off",
      "jsdoc/require-param": "off",
      "jsdoc/require-returns": "off",
    },
  },
  eslintPluginPrettier,
);
