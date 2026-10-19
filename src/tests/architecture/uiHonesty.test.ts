import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = join(process.cwd(), "src");
const SCAN_DIRS = [
  "routes",
  join("shared", "ui"),
  ...readdirSync(join(SRC, "domains"))
    .map((domain) => join("domains", domain, "ui"))
    .filter((dir) => existsSync(join(SRC, dir))),
];

function collect(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) collect(path, files);
    else if (/\.(ts|tsx)$/.test(entry) && !entry.includes(".test.")) files.push(path);
  }
  return files;
}

/**
 * Racing primitive token families forbidden in production UI. The semantic
 * layer (background, foreground, primary, border, card, muted, surface, accent)
 * aliases them; components must consume the semantic names.
 */
const PRIMITIVE_CLASS =
  /(?<![\w-])(?:text|bg|border(?:-[trblxy])?|ring(?:-offset)?|fill|stroke|from|via|to|placeholder|shadow|divide|outline|caret|accent|decoration)-(?:cream(?:-faint|-muted|-bright)?|gold(?:-light|-muted|-subtle|-bright|-dark|-400)?|t950|t900|t800|t750|t700|t600|t500)(?:\/\d+|\/\[[^\]]+\])?(?![\w-])/;

const RAW_COLOR = /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d|oklch\(\s*[\d.]/;

/**
 * Files where raw colour literals are game data (silk, coat, palette, portrait
 * colours) rather than theme tokens — allowed by the design bible's
 * "silks are user-data colour" rule — or have a structural reason:
 * - chart.tsx: recharts attribute selectors ([stroke='#ccc']) match DOM attrs.
 * - broadcastCanvas.ts: canvas token reader keeps deterministic fallbacks.
 * - JockeyFilterPanel.tsx: silk-colour filter values matched against saved data.
 */
const RAW_COLOR_ALLOWLIST = new Set([
  join("shared", "ui", "chart.tsx"),
  join("domains", "race", "ui", "broadcastCanvas.ts"),
  join("domains", "jockey", "ui", "JockeyFilterPanel.tsx"),
  join("domains", "jockey", "ui", "JockeyAvatar.stories.tsx"),
  join("domains", "horse", "ui", "HeadSvg.tsx"),
  join("domains", "horse", "ui", "FullBodySvg.tsx"),
  join("domains", "person", "ui", "PersonPortrait.tsx"),
  join("domains", "person", "ui", "PersonPortrait.stories.tsx"),
  join("domains", "awards", "ui", "VisualTrophy.tsx"),
  join("domains", "awards", "ui", "assets", "shared.tsx"),
  join("domains", "awards", "ui", "assets", "north-america", "category.tsx"),
  join("domains", "shell", "ui", "SilkDot.tsx"),
  join("domains", "breeding", "ui", "PedigreeTree.tsx"),
  join("domains", "onboarding", "ui", "SilkPreview.tsx"),
  join("domains", "onboarding", "ui", "steps", "StepSilks.tsx"),
  join("shared", "ui", "charts", "Sparkline.stories.tsx"),
]);

describe("UI honesty and legibility", () => {
  it("forbids primitive racing token classes in production UI", () => {
    const violations: string[] = [];
    for (const directory of SCAN_DIRS) {
      for (const file of collect(join(SRC, directory))) {
        const rel = relative(SRC, file);
        const text = readFileSync(file, "utf8");
        for (const match of text.matchAll(new RegExp(PRIMITIVE_CLASS, "g"))) {
          violations.push(`${rel}: ${match[0]}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("forbids raw colour literals outside the data/canvas allowlist", () => {
    const violations: string[] = [];
    for (const directory of SCAN_DIRS) {
      for (const file of collect(join(SRC, directory))) {
        const rel = relative(SRC, file);
        if (RAW_COLOR_ALLOWLIST.has(rel)) continue;
        const text = readFileSync(file, "utf8");
        for (const match of text.matchAll(new RegExp(RAW_COLOR, "g"))) {
          violations.push(`${rel}: ${match[0]}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

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
