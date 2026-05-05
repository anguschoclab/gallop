import { defineConfig } from "vitest/config";
import path from "node:path";
import type { Plugin } from "vite";

/**
 * Rewrites bare relative imports inside test files so that a test at
 *   src/tests/game/horseGen.test.ts  importing  "./horseGen"
 * resolves to
 *   src/game/horseGen
 * instead of the non-existent src/tests/game/horseGen.
 *
 * The rule: strip the "tests/" segment from the importer's directory and use
 * that as the base for the relative specifier.
 */
function testSourceRedirectPlugin(): Plugin {
  const srcRoot = path.resolve(__dirname, "src");

  return {
    name: "test-source-redirect",
    enforce: "pre",
    resolveId(source, importer) {
      if (!importer) return null;
      // Only act on bare relative imports from test files
      if (!source.startsWith("./") && !source.startsWith("../")) return null;
      if (!importer.endsWith(".test.ts") && !importer.endsWith(".test.tsx")) return null;

      const importerDir = path.dirname(importer);
      // Check if importer lives under src/tests/
      const testsRoot = path.join(srcRoot, "tests");
      if (!importerDir.startsWith(testsRoot)) return null;

      // Build what the path would look like without the "tests/" segment
      const relative = path.relative(testsRoot, importerDir); // e.g. "game" or "core/breeding"
      const sourceRoot = path.join(srcRoot, relative); // e.g. src/game or src/core/breeding

      // Resolve the specifier relative to the source root instead
      const resolved = path.resolve(sourceRoot, source);
      return resolved;
    },
  };
}

export default defineConfig({
  plugins: [testSourceRedirectPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});
