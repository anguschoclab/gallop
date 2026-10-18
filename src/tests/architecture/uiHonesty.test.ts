import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = join(process.cwd(), "src");
const SCAN_DIRS = ["components", "routes"];

function collect(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) collect(path, files);
    else if (/\.(ts|tsx)$/.test(entry) && !entry.includes(".test.")) files.push(path);
  }
  return files;
}

describe("UI honesty and legibility", () => {
  it("caps display label tracking at 0.15em and keeps numeric copy upright", () => {
    const violations: string[] = [];

    for (const directory of SCAN_DIRS) {
      for (const file of collect(join(SRC, directory))) {
        const text = readFileSync(file, "utf8");
        for (const match of text.matchAll(/tracking-\[0\.(\d+)em\]/g)) {
          if (Number(`0.${match[1]}`) > 0.15) {
            violations.push(`${relative(SRC, file)} uses tracking-[0.${match[1]}em]`);
          }
        }
        for (const match of text.matchAll(
          /["'`]([^"'`]*\bfont-mono\b[^"'`]*\bitalic\b[^"'`]*)["'`]/g,
        )) {
          violations.push(`${relative(SRC, file)} uses italic numeric copy: ${match[1]}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("contains no fabricated operations-room status chrome", () => {
    const forbidden = [
      "LIVE SECURE",
      "SECTOR ALPHA",
      "GLOBAL SURVEILLANCE",
      "REAL-TIME FEEDS",
      "INITIALIZING",
      "MAJOR CHALLENGER",
      "MARKET POSITION: STABLE",
    ];
    const violations: string[] = [];

    for (const directory of SCAN_DIRS) {
      for (const file of collect(join(SRC, directory))) {
        const text = readFileSync(file, "utf8").toUpperCase();
        for (const phrase of forbidden) {
          if (text.includes(phrase)) violations.push(`${relative(SRC, file)}: ${phrase}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
