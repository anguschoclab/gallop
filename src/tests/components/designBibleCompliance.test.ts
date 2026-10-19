/**
 * Design Bible Compliance Tests
 *
 * Validates that newly surfaced components follow design bible patterns:
 * - Typography tokens (var(--font-display), var(--font-body), var(--font-mono))
 * - Color tokens (no hardcoded hex colors)
 * - Tabular figures for numbers
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

function readComponent(name: string): string {
  const [domain, file] = name.split("/");
  const targetDomain = domain === "npc" ? "agents" : domain;
  return readFileSync(join(__dirname, "..", "..", "domains", targetDomain, "ui", file), "utf-8");
}

describe("Design Bible Compliance: EconomicIndicators", () => {
  const content = readComponent("analytics/EconomicIndicators.tsx");

  it("uses font-mono for numeric values", () => {
    expect(content).toMatch(/font-mono/);
  });

  it("uses uppercase tracking for labels", () => {
    expect(content).toMatch(/uppercase/);
    expect(content).toMatch(/tracking/);
  });

  it("does not use hardcoded hex colors", () => {
    // Allow bg-slate-900, text-foreground, etc. — only flag raw hex like #fff
    const hexMatches = content.match(/#[0-9a-fA-F]{3,8}\b/g);
    // Filter out non-color hex (unlikely in TSX)
    if (hexMatches) {
      // Allow none — all colors should be token-based
      expect(hexMatches.length).toBe(0);
    }
  });
});

describe("Design Bible Compliance: DiplomacyPanel", () => {
  const content = readComponent("npc/DiplomacyPanel.tsx");

  it("uses font-mono for numeric values", () => {
    expect(content).toMatch(/font-mono/);
  });

  it("uses uppercase tracking for labels", () => {
    expect(content).toMatch(/uppercase/);
    expect(content).toMatch(/tracking/);
  });

  it("does not use hardcoded hex colors", () => {
    const hexMatches = content.match(/#[0-9a-fA-F]{3,8}\b/g);
    if (hexMatches) {
      expect(hexMatches.length).toBe(0);
    }
  });
});

describe("Design Bible Compliance: TransportPlanner", () => {
  const content = readComponent("transportation/TransportPlanner.tsx");

  it("uses font-mono for numeric values", () => {
    expect(content).toMatch(/font-mono/);
  });

  it("uses uppercase tracking for labels", () => {
    expect(content).toMatch(/uppercase/);
    expect(content).toMatch(/tracking/);
  });
});

describe("Design Bible Compliance: SyndicateLedgerPanel", () => {
  const content = readComponent("syndicates/SyndicateLedgerPanel.tsx");

  it("uses font-mono for numeric values", () => {
    expect(content).toMatch(/font-mono/);
  });

  it("uses uppercase tracking for labels", () => {
    expect(content).toMatch(/uppercase/);
    expect(content).toMatch(/tracking/);
  });

  it("does not use hardcoded colors — chart strokes come from token-based Sparkline", () => {
    expect(content.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
    expect(content).not.toMatch(/rgba?\(|oklch\(/);
    expect(content).not.toMatch(/stroke="/);
  });
});

// ── Shared-primitive and audited-screen compliance ──────────────────────────

const SRC_ROOT = join(__dirname, "..", "..");

function readSrc(rel: string): string {
  return readFileSync(join(SRC_ROOT, rel), "utf-8");
}

/** Primitive racing-palette utility classes forbidden in production UI. */
const PRIMITIVE_TOKEN =
  /(?:^|[^a-zA-Z0-9_-])(?:bg|text|border|from|to|via|ring|fill|stroke)-(?:gold|cream|t[0-9]{3})(?:-[a-z]+)?(?:[\s/"'`]|$)/;

const NO_HEX = /#[0-9a-fA-F]{3,8}\b/;

interface ComponentSpec {
  path: string;
  /** Numeric or data-dense surfaces must use tabular figures or mono. */
  numeric?: boolean;
  /** Extra substrings that must be present. */
  mustContain?: RegExp[];
  /** Extra regexes that must NOT match. */
  mustNotContain?: RegExp[];
}

const AUDITED_COMPONENTS: ComponentSpec[] = [
  { path: "shared/ui/common/EmptyState.tsx" },
  { path: "shared/ui/common/ErrorState.tsx" },
  { path: "shared/ui/common/PageHeader.tsx" },
  { path: "domains/dashboard/ui/NextActionBanner.tsx" },
  { path: "domains/dashboard/ui/StableRosterWidget.tsx", numeric: true },
  { path: "domains/stable/ui/StableRosterLedger.tsx", numeric: true },
  {
    path: "domains/race/ui/RaceBroadcast.tsx",
    mustContain: [/aria-live="polite"/],
  },
  {
    path: "domains/shell/ui/SidebarNav.tsx",
    mustNotContain: [/to:\s*"\/gazette"/, /to:\s*"\/recap"/],
  },
  { path: "domains/honors/ui/AwardsTab.tsx" },
  { path: "domains/calendar/ui/CalendarRaceItem.tsx" },
  { path: "domains/shell/ui/DefaultErrorComponent.tsx" },
  { path: "domains/settings/ui/DisplaySettingsCard.tsx" },
];

describe("Design Bible Compliance: shared primitives and audited screens", () => {
  it.each(AUDITED_COMPONENTS.map((c) => [c.path, c] as const))(
    "%s uses semantic tokens only — no primitive racing palette or raw hex",
    (_name, spec) => {
      const content = readSrc(spec.path);
      expect(content).not.toMatch(PRIMITIVE_TOKEN);
      expect(content.match(NO_HEX)).toBeNull();
      for (const re of spec.mustNotContain ?? []) {
        expect(content).not.toMatch(re);
      }
      for (const re of spec.mustContain ?? []) {
        expect(content).toMatch(re);
      }
    },
  );

  it.each(AUDITED_COMPONENTS.filter((c) => c.numeric).map((c) => [c.path, c] as const))(
    "%s aligns numbers with tabular-nums or mono figures",
    (_name, spec) => {
      const content = readSrc(spec.path);
      expect(content).toMatch(/tabular-nums|font-mono|font-\[family-name:var\(--font-mono\)\]/);
    },
  );
});
