import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import jsdoc from "eslint-plugin-jsdoc";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi", "*.gen.ts", "src/routeTree.gen.ts", "tsconfig.json"] },
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
  // Exclude components (already handled in TSX rule)
  {
    files: ["src/components/**/*.tsx"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
  // Exclude hooks and component utilities from JSDoc — internal implementation
  {
    files: ["src/hooks/**/*.ts", "src/components/**/*.ts"],
    rules: {
      "jsdoc/require-jsdoc": "off",
      "jsdoc/require-param": "off",
      "jsdoc/require-returns": "off",
    },
  },
  // Exclude routes (routes often have conditional hook calls)
  {
    files: ["src/routes/**/*.tsx"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
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
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/__tests__/**/*.ts",
      "**/__tests__/**/*.tsx",
    ],
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
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Exclude hooks (hooks often use any for type assertions)
  {
    files: ["src/hooks/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/rules-of-hooks": "off",
    },
  },
  // Exclude services (services often use any for type assertions)
  {
    files: ["src/services/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Exclude components (already handled in TSX rule)
  {
    files: ["src/components/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/rules-of-hooks": "off",
    },
  },
  // Exclude core (core often uses any for type assertions)
  {
    files: ["src/core/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "jsdoc/require-returns": "off",
      "jsdoc/require-jsdoc": "off",
      "no-useless-escape": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Exclude game (game often uses any for type assertions)
  {
    files: ["src/game/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "jsdoc/require-returns": "off",
      "jsdoc/require-jsdoc": "off",
      "no-case-declarations": "off",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "off",
    },
  },
  // Exclude tests (already handled in test rule)
  {
    files: ["src/tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "jsdoc/require-returns": "off",
      "jsdoc/require-jsdoc": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Exclude utils (utils often use any for type assertions)
  {
    files: ["src/utils/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "jsdoc/require-returns": "off",
      "jsdoc/require-jsdoc": "off",
    },
  },
  // Exclude lib (lib often uses any for type assertions)
  {
    files: ["src/lib/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "jsdoc/require-returns": "off",
      "jsdoc/require-jsdoc": "off",
    },
  },
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
  // Guardrail: ban unstable useGame selectors (fresh array/object each render
  // → unstable useSyncExternalStore snapshot → infinite re-render loop).
  // Use useGameWithShallow for `?? []`/`?? {}`, or a module-level stable const.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.test.{ts,tsx}", "src/tests/**", "src/test-utils/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.name='useGame'] > ArrowFunctionExpression > LogicalExpression[operator='??'][right.type='ArrayExpression']",
          message:
            "Unstable useGame selector: `?? []` returns a new array each render and causes an infinite re-render loop. Use useGameWithShallow, or a module-level EMPTY const.",
        },
        {
          selector:
            "CallExpression[callee.name='useGame'] > ArrowFunctionExpression > LogicalExpression[operator='??'][right.type='ObjectExpression']",
          message:
            "Unstable useGame selector: `?? {}` returns a new object each render and causes an infinite re-render loop. Use useGameWithShallow, or a module-level EMPTY const.",
        },
        {
          selector:
            "CallExpression[callee.name='useGame'] > ArrowFunctionExpression[body.type='ArrayExpression']",
          message:
            "Unstable useGame selector: returning an array literal creates a new reference each render. Use useGameWithShallow.",
        },
        {
          selector:
            "CallExpression[callee.name='useGame'] > ArrowFunctionExpression[body.type='ObjectExpression']",
          message:
            "Unstable useGame selector: returning an object literal creates a new reference each render. Use useGameWithShallow.",
        },
        {
          selector:
            "CallExpression[callee.name='useGame'] > ArrowFunctionExpression[body.type='CallExpression'][body.callee.type='MemberExpression'][body.callee.property.name=/^(map|filter|slice|sort|concat|reduce|flat|flatMap)$/]",
          message:
            "Unstable useGame selector: an array transform (.map/.filter/.slice/…) returns a new array each render. Select the raw value and transform in a useMemo, or use useGameWithShallow.",
        },
        {
          selector:
            "CallExpression[callee.name='useGame'] ArrowFunctionExpression BlockStatement ReturnStatement > LogicalExpression[operator='??'][right.type='ArrayExpression']",
          message:
            "Unstable useGame selector: `?? []` in a block-body return creates a new array each render. Use useGameWithShallow, or a module-level EMPTY const.",
        },
        {
          selector:
            "CallExpression[callee.name='useGame'] ArrowFunctionExpression BlockStatement ReturnStatement > LogicalExpression[operator='??'][right.type='ObjectExpression']",
          message:
            "Unstable useGame selector: `?? {}` in a block-body return creates a new object each render. Use useGameWithShallow, or a module-level EMPTY const.",
        },
      ],
    },
  },
  eslintPluginPrettier,
);
