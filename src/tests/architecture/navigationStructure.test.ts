import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { navSections, moreNavGroup } from "@/domains/shell/ui/navModel";

const ROUTES_DIR = join(process.cwd(), "src", "routes");

/**
 * Derive a URL path from a TanStack file-route filename.
 *   stable.$horseId.tsx -> /stable/$horseId
 *   auction.index.tsx   -> /auction
 *   index.tsx           -> /
 */
function routePathFromFile(file: string): string {
  const name = file.replace(/\.tsx$/, "");
  if (name === "index") return "/";
  const segments = name.split(".").filter((s) => s !== "index");
  return "/" + segments.join("/");
}

/**
 * Routes deliberately not surfaced in the sidebar. They are reached from
 * inside a parent flow (horse detail, race detail, onboarding) or permanently
 * redirect into a hub tab.
 */
const DEEP_LINK_ONLY = new Set([
  "/start",
  "/new-game",
  "/epilogue",
  "/debug/cash-pressure-tuning",
  "/ceremony/$invitationId",
  "/race/$raceId",
  "/foal-development/$horseId",
  "/strategy/$horseId",
  "/jockey/$jockeyId",
  "/syndicate/$syndicateId",
  // Permanently redirected into hub tabs:
  "/gazette",
  "/recap",
  "/races",
  "/race-browser",
]);

const allNavTargets = [
  ...navSections.flatMap((s) => s.items.map((i) => i.to)),
  ...moreNavGroup.items.map((i) => i.to),
];

function reachable(path: string): boolean {
  if (DEEP_LINK_ONLY.has(path)) return true;
  return allNavTargets.some((to) =>
    to === "/" ? path === "/" : path === to || path.startsWith(to + "/"),
  );
}

describe("navigation structure", () => {
  it("has at most 3 top-level sections", () => {
    expect(navSections.length).toBeLessThanOrEqual(3);
  });

  it("has at most 12 primary items", () => {
    const count = navSections.reduce((n, s) => n + s.items.length, 0);
    expect(count).toBeLessThanOrEqual(12);
  });

  it("uses a unique icon for every primary item", () => {
    const icons = navSections.flatMap((s) => s.items.map((i) => i.icon));
    expect(new Set(icons).size).toBe(icons.length);
  });

  it("does not surface folded narrative routes as primary items", () => {
    const primary = navSections.flatMap((s) => s.items.map((i) => i.to));
    expect(primary).not.toContain("/gazette");
    expect(primary).not.toContain("/recap");
    expect(primary).not.toContain("/races");
    expect(primary).not.toContain("/race-browser");
  });

  it("exposes a documented More group", () => {
    expect(moreNavGroup.label).toBe("More");
    expect(moreNavGroup.items.length).toBeGreaterThan(0);
  });

  it("keeps every route reachable via primary nav, More, or a documented deep link", () => {
    const unreachable: string[] = [];
    for (const file of readdirSync(ROUTES_DIR)) {
      if (!file.endsWith(".tsx") || file === "__root.tsx") continue;
      const path = routePathFromFile(file);
      if (!reachable(path)) unreachable.push(`${file} -> ${path}`);
    }
    expect(unreachable).toEqual([]);
  });
});
