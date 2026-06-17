# Dashboard-as-Verb + Briefing Fold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the dashboard from nine parallel status widgets into a screen that answers "what do I do next?" with one primary CTA, and fold Gazette + Recap + News into a single tabbed "Briefing" hub to shrink the Headquarters nav.

**Architecture:** Two independent parts. (A) A pure `deriveNextAction(dashboardData)` that ranks the player's most urgent next decision and returns a labelled CTA + link; a `NextActionBanner` renders it at the top of the dashboard above the existing widget grid. (B) A `/briefing` tabbed route (Gazette / Recap / News) following the exact hub pattern already used for Honors/Analytics/Racing (`useTabParam` + redirects), collapsing three Headquarters items into one.

**Tech Stack:** React 19, TanStack Router (file routes, `useTabParam`), Zustand (`useDashboardData`), Radix Tabs, Vitest.

---

## Context

The dashboard ([index.tsx](src/routes/index.tsx)) is a "Command Center" rendering nine parallel widgets (Gazette, OperationsTicker, KeyRivals, HQOps, StableRoster, Circuit, Reputation, Apprentice, NewsFeed, LegacyAwards). It displays state well but never tells a returning player what to _do_ — failing the product's own success criterion ("a returning player knows what to do next within 60 seconds"). Separately, the "Headquarters" nav section still holds eight items, three of which are read-only narrative surfaces — `/gazette` (the weekly paper), `/recap` (last race recaps), and the dashboard's own news feed — that belong together.

Both fixes reuse existing pieces:

- [useDashboardData](src/hooks/dashboard/useDashboardData.ts) already returns everything a next-action ranker needs: `urgentMessages`, `nextOwnedRace`, `lowEnergyHorses`, `activeAuctions`, `day`.
- The hub pattern (`useTabParam`, `validateSearch`, redirect-old-routes) is already established by Honors/Analytics/Racing and is copied here.
- `/gazette` renders the `Gazette` component; `/recap` renders `useRecapData`-driven content — both move into tabs unchanged.

**Outcome:** The dashboard opens with a single "here's your next move" banner; Headquarters drops from 8 to 6 items; the three narrative surfaces live under one Briefing destination.

---

## File Structure

**New files**

- `src/core/dashboard/nextAction.ts` — pure `deriveNextAction(input)` → `{ kind, label, detail, to, search? } | null`.
- `src/components/dashboard/NextActionBanner.tsx` — renders the CTA.
- `src/routes/briefing.tsx` — the Briefing hub.
- `src/components/briefing/{GazetteTab,RecapTab,NewsTab}.tsx` — tab bodies.
- Test: `src/tests/core/dashboard/nextAction.test.ts`.

**Modified files**

- `src/routes/index.tsx` — mount `NextActionBanner` above the grid.
- `src/routes/gazette.tsx`, `src/routes/recap.tsx` — become redirects.
- `src/components/SidebarNav.tsx` — replace Gazette + Recap with one "Briefing" item.

**Reused as-is:** `useDashboardData`, `useTabParam` ([src/hooks/ui/useTabParam.ts](src/hooks/ui/useTabParam.ts)), `Gazette` ([src/components/narrative/Gazette.tsx](src/components/narrative/Gazette.tsx)), `useRecapData`, the dashboard `NewsFeedWidget`.

---

## Conventions (read before starting)

- Hub pattern reference: open [src/routes/honors.tsx](src/routes/honors.tsx) — copy its `validateSearch` + `useTabParam` + `Tabs value/onValueChange` shape exactly.
- Redirect pattern: a folded route keeps its path and does `beforeLoad: () => { throw redirect({ to: "/briefing", search: { tab: "…" } }); }`.
- After adding/removing route files, run `bun run dev` once to regenerate `src/routeTree.gen.ts`, then commit it.
- Run one test: `bunx vitest run <path>`.

---

## PART A — Dashboard as a verb

## Task 1: `deriveNextAction` ranker

**Files:**

- Create: `src/core/dashboard/nextAction.ts`
- Test: `src/tests/core/dashboard/nextAction.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/core/dashboard/nextAction.test.ts
import { describe, it, expect } from "vitest";
import { deriveNextAction, type NextActionInput } from "@/core/dashboard/nextAction";

const base: NextActionInput = {
  urgentMessageCount: 0,
  nextOwnedRace: null,
  lowEnergyCount: 0,
  openAuctionCount: 0,
  day: 10,
};

describe("deriveNextAction", () => {
  it("prioritises an urgent inbox message above all else", () => {
    const a = deriveNextAction({
      ...base,
      urgentMessageCount: 2,
      nextOwnedRace: { id: "r1", day: 11 },
      lowEnergyCount: 3,
    });
    expect(a?.kind).toBe("inbox");
    expect(a?.to).toBe("/inbox");
  });

  it("points to a race the player is entered in (race day) over fatigue/auctions", () => {
    const a = deriveNextAction({
      ...base,
      nextOwnedRace: { id: "r1", day: 10 },
      lowEnergyCount: 3,
      openAuctionCount: 1,
    });
    expect(a?.kind).toBe("race");
    expect(a?.to).toBe("/race/$raceId");
    expect(a?.search).toBeUndefined();
    expect(a?.params).toEqual({ raceId: "r1" });
  });

  it("flags fatigued horses when nothing more urgent exists", () => {
    const a = deriveNextAction({ ...base, lowEnergyCount: 2 });
    expect(a?.kind).toBe("fatigue");
    expect(a?.to).toBe("/stable");
    expect(a?.detail).toContain("2");
  });

  it("surfaces an open auction when present and nothing else is pending", () => {
    const a = deriveNextAction({ ...base, openAuctionCount: 1 });
    expect(a?.kind).toBe("auction");
    expect(a?.to).toBe("/auction");
  });

  it("falls back to advancing the day when nothing needs attention", () => {
    const a = deriveNextAction(base);
    expect(a?.kind).toBe("advance");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `bunx vitest run src/tests/core/dashboard/nextAction.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

```ts
// src/core/dashboard/nextAction.ts
export interface NextActionInput {
  urgentMessageCount: number;
  nextOwnedRace: { id: string; day: number } | null;
  lowEnergyCount: number;
  openAuctionCount: number;
  day: number;
}

export type NextActionKind = "inbox" | "race" | "fatigue" | "auction" | "advance";

export interface NextAction {
  kind: NextActionKind;
  label: string;
  detail: string;
  to: string;
  params?: Record<string, string>;
  search?: Record<string, unknown>;
}

/**
 * Rank the single most important next decision for the player. Priority order:
 * urgent inbox > a race you're entered in > fatigued horses > open auction >
 * advance the day.
 *
 * @param input - derived dashboard signals
 * @returns the top-priority action, or the advance-day fallback (never null)
 */
export function deriveNextAction(input: NextActionInput): NextAction {
  if (input.urgentMessageCount > 0) {
    return {
      kind: "inbox",
      label: "Review urgent messages",
      detail: `${input.urgentMessageCount} need your attention`,
      to: "/inbox",
    };
  }

  if (input.nextOwnedRace) {
    return {
      kind: "race",
      label: "Go to race day",
      detail: `Your runner is entered on Day ${input.nextOwnedRace.day}`,
      to: "/race/$raceId",
      params: { raceId: input.nextOwnedRace.id },
    };
  }

  if (input.lowEnergyCount > 0) {
    return {
      kind: "fatigue",
      label: "Rest fatigued horses",
      detail: `${input.lowEnergyCount} ${input.lowEnergyCount === 1 ? "horse is" : "horses are"} low on energy`,
      to: "/stable",
    };
  }

  if (input.openAuctionCount > 0) {
    return {
      kind: "auction",
      label: "Visit the sales ring",
      detail: `${input.openAuctionCount} auction${input.openAuctionCount === 1 ? "" : "s"} open`,
      to: "/auction",
    };
  }

  return {
    kind: "advance",
    label: "Advance to the next day",
    detail: "Nothing needs your attention — move the season forward",
    to: "/",
  };
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `bunx vitest run src/tests/core/dashboard/nextAction.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/dashboard/nextAction.ts src/tests/core/dashboard/nextAction.test.ts
git commit -m "feat(dashboard): deriveNextAction — rank the player's next decision"
```

---

## Task 2: `NextActionBanner` + mount on the dashboard

**Files:**

- Create: `src/components/dashboard/NextActionBanner.tsx`
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Build the banner**

```tsx
// src/components/dashboard/NextActionBanner.tsx
import { Link } from "@tanstack/react-router";
import { ChevronRight, Bell, Flag, BatteryLow, Gavel, CalendarClock } from "lucide-react";
import type { NextAction, NextActionKind } from "@/core/dashboard/nextAction";

const ICONS: Record<NextActionKind, typeof Bell> = {
  inbox: Bell,
  race: Flag,
  fatigue: BatteryLow,
  auction: Gavel,
  advance: CalendarClock,
};

export function NextActionBanner({ action }: { action: NextAction }) {
  const Icon = ICONS[action.kind];
  return (
    <Link
      to={action.to}
      params={action.params as never}
      search={action.search as never}
      className="group flex items-center gap-4 border border-gold/30 bg-gold/5 hover:bg-gold/10 transition-colors p-4 rounded-lg"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 text-gold shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold/60">Next up</div>
        <div className="text-lg font-bold text-cream font-[family-name:var(--font-display)] truncate">
          {action.label}
        </div>
        <div className="text-sm text-cream-muted truncate">{action.detail}</div>
      </div>
      <ChevronRight className="h-5 w-5 text-gold/50 group-hover:translate-x-1 transition-transform shrink-0" />
    </Link>
  );
}
```

- [ ] **Step 2: Wire it into the dashboard**

In [src/routes/index.tsx](src/routes/index.tsx):

1. Add imports:

```tsx
import { NextActionBanner } from "@/components/dashboard/NextActionBanner";
import { deriveNextAction } from "@/core/dashboard/nextAction";
```

2. The component already destructures `useDashboardData()`. Build the action from those values (place after the `useDashboardData()` call):

```tsx
const nextAction = deriveNextAction({
  urgentMessageCount: urgentMessages.length,
  nextOwnedRace: nextOwnedRace ? { id: nextOwnedRace.id, day: nextOwnedRace.day } : null,
  lowEnergyCount: lowEnergyHorses.length,
  openAuctionCount: activeAuctions.length,
  day,
});
```

3. Render the banner immediately after the header block and before `<UrgentMessagesStrip>` (so the single CTA sits at the very top of the body):

```tsx
<NextActionBanner action={nextAction} />
```

(If `useDashboardData` does not already expose `urgentMessages`, `nextOwnedRace`, `lowEnergyHorses`, `activeAuctions`, and `day` in this component's destructure, add them — they are all returned by the hook per [useDashboardData.ts](src/hooks/dashboard/useDashboardData.ts).)

- [ ] **Step 3: Type-check + verify in preview**

Run: `bunx tsc --noEmit` (expected clean).
Preview the dashboard: confirm a "Next up" banner renders at the top with a sensible CTA (e.g. fatigued-horses or advance-day on a fresh game), and clicking it navigates correctly. `preview_console_logs` clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/NextActionBanner.tsx src/routes/index.tsx
git commit -m "feat(dashboard): single next-action banner at top of Command Center"
```

---

## PART B — Briefing fold

## Task 3: Create the `/briefing` hub

**Files:**

- Create: `src/routes/briefing.tsx`, `src/components/briefing/{GazetteTab,RecapTab,NewsTab}.tsx`

- [ ] **Step 1: Extract tab bodies**

- `GazetteTab.tsx` → `export function GazetteTab() { return <Gazette />; }` (import `Gazette` from `@/components/narrative/Gazette`).
- `RecapTab.tsx` → move the render body of [src/routes/recap.tsx](src/routes/recap.tsx) into `export function RecapTab()` (keep its `useRecapData` usage and all imports).
- `NewsTab.tsx` → render the dashboard's full news feed. Reuse the existing `NewsFeedWidget` ([src/components/dashboard/NewsFeedWidget.tsx]) — `export function NewsTab() { return <NewsFeedWidget />; }`. (If `NewsFeedWidget` is sized as a small dashboard tile, wrap it in a full-width container; do not restructure the widget.)

- [ ] **Step 2: Create the hub route (copy the Honors pattern)**

```tsx
// src/routes/briefing.tsx
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Newspaper, Trophy, Rss } from "lucide-react";
import { useTabParam } from "@/hooks/ui/useTabParam";
import { GazetteTab } from "@/components/briefing/GazetteTab";
import { RecapTab } from "@/components/briefing/RecapTab";
import { NewsTab } from "@/components/briefing/NewsTab";

const BRIEFING_TABS = ["gazette", "recap", "news"] as const;

export const Route = createFileRoute("/briefing")({
  validateSearch: z.object({ tab: z.enum(BRIEFING_TABS).optional() }),
  component: BriefingPage,
});

function BriefingPage() {
  const { tab, setTab } = useTabParam("gazette", BRIEFING_TABS);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-[family-name:var(--font-display)]">
          Briefing
        </h1>
        <p className="text-cream-muted font-[family-name:var(--font-body)]">
          The Gazette, race recaps, and the latest from around the circuit.
        </p>
      </div>
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as (typeof BRIEFING_TABS)[number])}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="gazette" className="gap-2">
            <Newspaper className="h-4 w-4" />
            Gazette
          </TabsTrigger>
          <TabsTrigger value="recap" className="gap-2">
            <Trophy className="h-4 w-4" />
            Recap
          </TabsTrigger>
          <TabsTrigger value="news" className="gap-2">
            <Rss className="h-4 w-4" />
            News
          </TabsTrigger>
        </TabsList>
        <TabsContent value="gazette">
          <GazetteTab />
        </TabsContent>
        <TabsContent value="recap">
          <RecapTab />
        </TabsContent>
        <TabsContent value="news">
          <NewsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 3: Redirect old routes**

Replace the entire body of `src/routes/gazette.tsx` and `src/routes/recap.tsx`:

```tsx
// src/routes/gazette.tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/gazette")({
  beforeLoad: () => {
    throw redirect({ to: "/briefing", search: { tab: "gazette" } });
  },
});
```

…and the same for `recap.tsx` with `tab: "recap"`.

- [ ] **Step 4: Update the sidebar**

In [src/components/SidebarNav.tsx](src/components/SidebarNav.tsx), in the "Headquarters" section, **remove** the `/gazette` and `/recap` items and **add** one Briefing item (place where Gazette was):

```tsx
      { to: "/briefing", label: "Briefing", icon: Newspaper, exact: false },
```

Ensure `Newspaper` is imported from `lucide-react` at the top of the file.

- [ ] **Step 5: Regenerate route tree, type-check, verify**

```bash
bun run dev          # regenerates routeTree.gen.ts; leave running for preview
bunx tsc --noEmit
```

Preview: open `/briefing`, cycle the three tabs (URL becomes `/briefing?tab=recap` etc.), confirm old `/gazette` and `/recap` redirect in, and the sidebar shows a single "Briefing" entry. `preview_console_logs` clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: fold gazette/recap/news into Briefing hub"
```

---

## Verification (whole-plan)

- [ ] `bunx vitest run src/tests/core/dashboard/nextAction.test.ts` — passes.
- [ ] `bun run test` — full suite green.
- [ ] `bunx tsc --noEmit` — clean; `bun run build` succeeds (route tree consistent, `routeTree.gen.ts` committed).
- [ ] Preview: dashboard shows one "Next up" CTA at top that routes correctly; `/briefing` hosts Gazette/Recap/News with deep-linkable tabs; `/gazette` and `/recap` redirect in; Headquarters nav dropped from 8 to 6 items.

## Self-review notes

- **Spec coverage:** Improvement #4 = "(a) fold gazette+recap+news into one Briefing; (b) turn the dashboard from 9 parallel widgets into one primary next-decision CTA." Part B = (a); Part A = (b).
- **No placeholders:** `deriveNextAction`, `NextActionBanner`, and the hub route are complete; tab extraction and redirects reference exact source bodies and the established Honors pattern.
- **Type consistency:** `NextAction`/`NextActionKind`/`NextActionInput` defined in Task 1 are consumed unchanged by Task 2; `BRIEFING_TABS` used consistently in route + redirects.
- **Confirm against real code (inline steps):** `useDashboardData` destructure already exposes the five signals (Task 2 Step 2); `NewsFeedWidget` sizing (Task 3 Step 1); nav item type supports a plain `{ to, label, icon }` entry (it does — matches existing Headquarters items).
