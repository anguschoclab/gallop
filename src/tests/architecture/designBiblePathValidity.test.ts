import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const BIBLE = join(process.cwd(), "docs", "design-bible");
const SRC = join(process.cwd(), "src");

function collectMd(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) collectMd(path, files);
    else if (entry.endsWith(".md")) files.push(path);
  }
  return files;
}

/**
 * Extracts src/ paths referenced from design-bible markdown.
 * Recognizes patterns like (../../../src/routes/x.tsx), [src/components/AppShell.tsx],
 * `src/game/foo.ts`, ../../../src/shared/ui/card.tsx.
 */
function extractSrcPaths(text: string): string[] {
  const found = new Set<string>();
  const patterns = [
    /(?:\]\((?:\.\.\/)+)(src\/[^)\s]+?)\)/g, // markdown links ../../../../src/...
    /(?:\]\()(src\/[^)\s]+?)\)/g, // markdown links src/...
    /`(src\/[^`\s]+?)`/g, // backtick code src/...
    /\[([^\]]*src\/[^\]]+?)\]\(/g, // link label containing src/
  ];
  for (const pattern of patterns) {
    for (const m of text.matchAll(pattern)) {
      found.add(m[1]);
    }
  }
  return [...found];
}

/** Doc template placeholders that are intentional examples, not real references. */
const PLACEHOLDER = /\.\.\.|route-name|ComponentName|<[a-z]+>/;

describe("design bible path validity", () => {
  it("references only src/ paths that exist", () => {
    const violations: string[] = [];
    for (const file of collectMd(BIBLE)) {
      const text = readFileSync(file, "utf8");
      for (const p of extractSrcPaths(text)) {
        // Strip line anchors like file.ts:123 or file.ts#L12
        const clean = p.replace(/[:#].*$/, "");
        if (PLACEHOLDER.test(clean)) continue;
        if (!existsSync(join(process.cwd(), clean))) {
          violations.push(`${relative(process.cwd(), file)} → ${clean}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
