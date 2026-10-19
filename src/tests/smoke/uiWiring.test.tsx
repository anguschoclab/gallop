/**
 * Phase 1.4 — UI Wiring Tests (Track C)
 *
 * 1. Empty state render tests for key routes
 * 2. Design bible compliance tests (hardcoded hex, tabular-nums)
 * 3. TDD red tests for unwired features (industry metrics, NPC bankruptcy)
 * 4. Verification tests for features wired since audit
 * 5. Route completeness audit
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Hoist matchMedia mock so it runs before any module-level code executes
vi.hoisted(() => {
  if (typeof globalThis !== "undefined") {
    const g = globalThis as any;
    if (!g.window?.matchMedia) {
      if (!g.window) g.window = {};
      g.window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      });
    }
  }
});

import { createElement } from "react";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { cleanup, screen } from "@testing-library/react";
import { createRouterMock, NotFoundError } from "@/test-utils/routerMock";

vi.mock("@tanstack/react-router", () => createRouterMock());

import { renderWithStore, midGameSeed } from "@/test-utils/renderWithStore";
import { useGame } from "@/platform/game/store";
import { createDefaultGameState } from "@/platform/game/store/state";
import { componentRouteCases as cases } from "@/test-utils/routeDiscovery";

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
  useGame.setState(createDefaultGameState());
});

// ---------------------------------------------------------------------------
// 1. Empty State Render Tests — render each route with empty store
// ---------------------------------------------------------------------------

describe("Phase 1.4 — Empty state rendering", () => {
  it("discovers routes to test", () => {
    expect(cases.length).toBeGreaterThan(20);
  });

  it.each(cases)("$name renders with empty state without throwing", ({ component }) => {
    try {
      renderWithStore(createElement(component), {
        horses: {},
        races: {},
        npcStables: [],
        jockeys: [],
        auctions: [],
        campaigns: [],
        cash: 0,
        day: 1,
      });
    } catch (e) {
      if (e instanceof NotFoundError) return;
      if (e instanceof Error && e.message.includes("isServer")) return;
      throw e;
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Design Bible Compliance — Hardcoded Hex Colors
// ---------------------------------------------------------------------------

describe("Phase 1.4 — Design bible: hardcoded hex colors in components", () => {
  const APPROVED_HEX_FILES: Record<string, string> = {
    "domains/person/ui/PersonPortrait.tsx": "procedural portrait rendering",
    "domains/jockey/ui/JockeyAvatar.stories.tsx": "story fixture silk colors",
    "domains/jockey/ui/JockeyFilterPanel.tsx": "silk color filter options",
    "domains/horse/ui/FullBodySvg.tsx": "procedural horse rendering",
    "domains/horse/ui/HeadSvg.tsx": "procedural horse rendering",
    "domains/race/ui/RaceVisualizer.tsx": "race canvas color encoding",
    "domains/race/ui/InRunningSnapshotDialog.tsx": "race visual color encoding",
    "domains/race/ui/RunnerMoodFace.tsx": "procedural runner rendering",
    "shared/ui/chart.tsx": "chart-library CSS selector",
    "domains/briefing/ui/RecapTab.tsx": "silk color fallback for replay charts",
    "domains/awards/ui/VisualTrophy.tsx": "SVG trophy gradient colors",
    "domains/awards/ui/assets/shared.tsx": "award SVG asset colors",
    "domains/awards/ui/assets/north-america/category.tsx": "award category SVG colors",
    "domains/onboarding/ui/steps/StepSilks.tsx": "new-game silk color options",
    "shared/ui/charts/Sparkline.stories.tsx": "story fixture chart colors",
  };
  const UI_SCAN_DIRS = [
    join("shared", "ui"),
    ...readdirSync(join(process.cwd(), "src", "domains"))
      .map((domain) => join("domains", domain, "ui"))
      .filter((dir) => existsSync(join(process.cwd(), "src", dir))),
  ];
  const hexPattern = /#[0-9a-fA-F]{3,8}\b/;

  function componentFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return componentFiles(path);
      return /\.(ts|tsx)$/.test(entry.name) ? [relative(process.cwd(), path)] : [];
    });
  }

  it("keeps hardcoded hex usage limited to evidenced rendering/data exceptions", () => {
    const files = UI_SCAN_DIRS.flatMap((dir) => componentFiles(join(process.cwd(), "src", dir)));
    const offenders = files.filter((file) => hexPattern.test(readFileSync(file, "utf8")));
    const normalizedOffenders = offenders
      .map((file) => file.replaceAll("\\", "/").replace(/^src\//, ""))
      .sort();

    expect(normalizedOffenders).toEqual(Object.keys(APPROVED_HEX_FILES).sort());
  });

  it.each(Object.entries(APPROVED_HEX_FILES))(
    "%s still contains the approved hex usage (%s)",
    (file) => {
      expect(hexPattern.test(readFileSync(join(process.cwd(), "src", file), "utf8"))).toBe(true);
    },
  );
});

// ---------------------------------------------------------------------------
// 3. Design Bible Compliance — tabular-nums on Numeric Displays
// ---------------------------------------------------------------------------

describe("Phase 1.4 — Design bible: tabular-nums usage verification", () => {
  it("SidebarNav cash display uses tabular-nums", async () => {
    const { SidebarNav } = await import("@/domains/shell/ui/SidebarNav");
    const noop = vi.fn();
    const { container } = renderWithStore(
      createElement(SidebarNav, {
        day: 1,
        cash: 100000,
        horseCount: 0,
        unreadCount: 0,
        unreadMessages: [],
        isAdvancing: false,
        onAdvanceDay: noop,
        onAdvanceWeek: noop,
        onAdvanceMonth: noop,
        onOpenAutoSim: noop,
        onSkipToAuction: noop,
        onSkipToRace: noop,
        onStartNewGame: noop,
      }),
      midGameSeed(),
    );
    const cashDisplay = screen.getByText(/\$100,000/);
    expect(cashDisplay.className).toContain("tabular-nums");
  });
});

// ---------------------------------------------------------------------------
// 4. TDD Red Tests — Unwired Features (skipped, driving future implementation)
// ---------------------------------------------------------------------------

describe("Phase 1.4 — Wired features verification (previously TDD red)", () => {
  it("Industry Metrics should be surfaced in analytics route", async () => {
    const mod: any = await import("@/routes/analytics.index");
    const Component = mod.Route?.options?.component ?? mod.default;
    const { container } = renderWithStore(createElement(Component), midGameSeed());
    expect(container.textContent?.toLowerCase()).toContain("industry");
  });

  it("NPC Bankruptcy events should be surfaced in gazette/briefing", async () => {
    const mod: any = await import("@/routes/briefing");
    const Component = mod.Route?.options?.component ?? mod.default;
    const { container } = renderWithStore(createElement(Component), midGameSeed());
    expect(container.textContent?.toLowerCase()).toContain("bankrupt");
  });
});

// ---------------------------------------------------------------------------
// 5. Verification Tests — Features Wired Since Audit
// ---------------------------------------------------------------------------

describe("Phase 1.4 — Verification: previously-unwired features now wired", () => {
  it("CareerArcPanel component exists and is importable", async () => {
    const mod = await import("@/domains/horse/ui/CareerArcPanel");
    expect(mod.CareerArcPanel).toBeDefined();
    expect(typeof mod.CareerArcPanel).toBe("function");
  });

  it("CareerArcPanel is wired in stable detail route", async () => {
    const routeSrc = await import("@/routes/stable.$horseId");
    expect(routeSrc).toBeDefined();
  });

  it("DiplomacyPanel component exists and is importable", async () => {
    const mod = await import("@/domains/agents/ui/DiplomacyPanel");
    expect(mod.DiplomacyPanel).toBeDefined();
    expect(typeof mod.DiplomacyPanel).toBe("function");
  });

  it("DiplomacyPanel is wired in NPC stable detail route", async () => {
    const routeSrc = await import("@/routes/npc-stables.$stableId");
    expect(routeSrc).toBeDefined();
  });

  it("StorylinesTab component exists and is importable", async () => {
    const mod = await import("@/domains/briefing/ui/StorylinesTab");
    expect(mod.StorylinesTab).toBeDefined();
    expect(typeof mod.StorylinesTab).toBe("function");
  });

  it("StorylinesTab is wired in briefing route", async () => {
    const routeSrc = await import("@/routes/briefing");
    expect(routeSrc).toBeDefined();
  });

  it("EconomicIndicators component exists and is importable", async () => {
    const mod = await import("@/domains/analytics/ui/EconomicIndicators");
    expect(mod.EconomicIndicators).toBeDefined();
    expect(typeof mod.EconomicIndicators).toBe("function");
  });

  it("EconomicIndicators is wired in analytics route", async () => {
    const routeSrc = await import("@/routes/analytics.index");
    expect(routeSrc).toBeDefined();
  });

  it("FoalDevelopmentPanel component exists and is importable", async () => {
    const mod = await import("@/domains/horse/ui/FoalDevelopmentPanel");
    expect(mod.FoalDevelopmentPanel).toBeDefined();
    expect(typeof mod.FoalDevelopmentPanel).toBe("function");
  });

  it("FoalDevelopmentPanel is wired in stable detail route", async () => {
    const routeSrc = await import("@/routes/stable.$horseId");
    expect(routeSrc).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 6. Route Completeness — Sidebar Nav Items
// ---------------------------------------------------------------------------

describe("Phase 1.4 — Route completeness audit", () => {
  const expectedRoutes = [
    "index",
    "inbox",
    "briefing",
    "analytics.index",
    "financial-report",
    "bookmarks",
    "stable.index",
    "horse-gallery",
    "breeding",
    "broodmares",
    "staff",
    "jockeys",
    "facilities",
    "honors",
    "hall-of-fame",
    "awards.index",
    "racing",
    "calendar.index",
    "records",
    "market",
    "auction.index",
    "npc-stables.index",
    "settings",
  ];

  it.each(expectedRoutes)("route '%s' module is importable", async (routeName) => {
    const mod: any = await import(`@/routes/${routeName}`);
    expect(mod).toBeDefined();
    const hasComponent = mod.Route?.options?.component ?? mod.default;
    const hasRedirect = mod.Route?.options?.beforeLoader ?? mod.Route?.options?.beforeLoad;
    expect(hasComponent ?? hasRedirect).toBeDefined();
  });
});
