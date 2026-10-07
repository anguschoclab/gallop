/**
 * rivalCareersMeta.test.ts — Route metadata for the rival-careers page.
 *
 * The route must export head() metadata (title + description) like other
 * content routes so the document title is honest and navigable.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: Record<string, unknown>) => opts,
  Link: () => null,
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));

import { Route } from "@/routes/npc-stables.rival-careers";

describe("npc-stables.rival-careers route", () => {
  it("declares head metadata with a title", () => {
    const head = (Route as { head?: () => { meta?: Array<Record<string, string>> } }).head;
    expect(head).toBeTypeOf("function");
    const meta = head!().meta ?? [];
    const title = meta.find((m) => "title" in m);
    expect(title?.title?.toLowerCase()).toContain("rival");
  });
});
