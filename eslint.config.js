import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import jsdoc from "eslint-plugin-jsdoc";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import unusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      ".output",
      ".vinxi",
      "storybook-static",
      "*.gen.ts",
      "src/routeTree.gen.ts",
      "tsconfig.json",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        // Pin the tsconfig root to this config's directory. When an editor's
        // ESLint server loads multiple copies of this config (e.g. repo
        // worktrees), typescript-eslint can't infer the root and fails every
        // parse with "multiple candidate TSConfigRootDirs are present".
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "unused-imports": unusedImports,
      jsdoc,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "warn",
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
  // Exclude hooks and component utilities from JSDoc — internal implementation
  {
    files: ["src/**/hooks/**/*.ts", "src/**/ui/**/*.ts"],
    rules: {
      "jsdoc/require-jsdoc": "off",
      "jsdoc/require-param": "off",
      "jsdoc/require-returns": "off",
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
    files: ["src/**/hooks/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Exclude services (services often use any for type assertions)
  {
    files: ["src/domains/**/application/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Exclude components (already handled in TSX rule)
  {
    files: ["src/**/ui/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Exclude core (core often uses any for type assertions)
  {
    files: ["src/platform/**/*.ts", "src/domains/**/*.ts"],
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
    files: ["src/platform/game/**/*.ts"],
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
  // Exclude shared (shared utilities use any for type assertions and lazy
  // require() to break module cycles)
  {
    files: ["src/shared/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "jsdoc/require-returns": "off",
      "jsdoc/require-jsdoc": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Exclude lib (lib often uses any for type assertions)
  {
    files: ["src/shared/common/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "jsdoc/require-returns": "off",
      "jsdoc/require-jsdoc": "off",
    },
  },
  {
    files: ["src/platform/workers/**/*.ts"],
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
  // ── Layering guardrails — enforced statically by
  //    src/tests/architecture/layeringRules.test.ts (zero-violation gate).
  //    These ESLint rules mirror the same matrix for editor feedback.
  // model/simulation may NOT reach the game store, UI, or application strata
  {
    files: ["src/domains/**/model/**/*.ts", "src/domains/**/simulation/**/*.ts"],
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "ImportDeclaration[importKind='value'][source.type='Literal'][source.value=/^@\\/platform\\/game/]",
          message:
            "Layering violation: model/simulation must not import from @/platform/game. Move the pure logic down, or inject via a port interface.",
        },
        {
          selector:
            "ImportDeclaration[importKind='value'][source.type='Literal'][source.value=/^@\\/domains\\/[^/]+\\/application/]",
          message:
            "Layering violation: model/simulation must not import from an application stratum. Invert the dependency via a port interface injected at the composition root.",
        },
        {
          selector:
            "ImportDeclaration[importKind='value'][source.type='Literal'][source.value=/^@\\/(domains\\/[^/]+\\/ui|shared\\/ui)/]",
          message: "Layering violation: model/simulation must not import from UI strata.",
        },
      ],
    },
  },
  // platform (engine/time/resolver/persistence/workers) may NOT import UI or
  // route code — the store/game subtree is exempt as the composition root
  {
    files: ["src/platform/**/*.ts"],
    ignores: ["src/platform/game/**", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "ImportDeclaration[importKind='value'][source.type='Literal'][source.value=/^@\\/(domains\\/[^/]+\\/ui|shared\\/ui)/]",
          message: "Layering violation: platform code must not import from UI strata.",
        },
        {
          selector:
            "ImportDeclaration[importKind='value'][source.type='Literal'][source.value=/^@\\/routes/]",
          message: "Layering violation: platform code must not import from @/routes.",
        },
      ],
    },
  },
  // application may NOT import from UI strata
  {
    files: ["src/domains/**/application/**/*.ts"],
    ignores: ["**/*.test.ts"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "ImportDeclaration[importKind='value'][source.type='Literal'][source.value=/^@\\/(domains\\/[^/]+\\/ui|shared\\/ui)/]",
          message: "Layering violation: application code must not import from UI strata.",
        },
      ],
    },
  },
  // UI strata may NOT import from simulation internals (route through
  // application facades/hooks)
  {
    files: ["src/**/ui/**/*.ts", "src/**/ui/**/*.tsx"],
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "ImportDeclaration[importKind='value'][source.type='Literal'][source.value=/^@\\/domains\\/[^/]+\\/simulation/]",
          message:
            "Layering violation: UI must not import from simulation internals directly. Route through an application facade or hook.",
        },
      ],
    },
  },
  eslintPluginPrettier,
);
