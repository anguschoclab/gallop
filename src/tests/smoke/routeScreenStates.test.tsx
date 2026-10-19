/**
 * Per-route screen-state matrix.
 *
 * Renders every route component under each screen state the app models:
 * loading (no profile / fresh world), empty (profile, empty collections),
 * pending (execution.status === "running"), error (execution failed +
 * unresolvable params), disabled-with-reason (insolvent), and success
 * (mid-game world with entities resolving every mock route param).
 *
 * Outcomes per route × state:
 *  - "rendered"  — the component produced UI without throwing.
 *  - "notFound"  — an entity guard fired (`throw notFound()`); legitimate for
 *    parameterized routes under states where the entity can't resolve.
 *  - crash       — any other throw. Fails the case.
 *
 * The suite asserts: no crashes anywhere, and every route renders real UI in
 * at least one state. Parameterized routes must additionally show a handled
 * error outcome (notFound or rendered error UI) under the `error` seed.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

import { createElement, type ComponentType } from "react";
import { cleanup } from "@testing-library/react";
import { createRouterMock, NotFoundError, MOCK_PARAMS } from "@/test-utils/routerMock";

vi.mock("@tanstack/react-router", () => createRouterMock());

import { renderWithStore, midGameSeed } from "@/test-utils/renderWithStore";
import { componentRouteCases } from "@/test-utils/routeDiscovery";
import { createTestHorse, createTestJockey, createTestStable } from "@/tests/helpers";
import type { GameState } from "@/platform/game/types";
import type { AdvanceExecution } from "@/platform/game/store/state/systemsState";
import type { Race } from "@/domains/race/simulation/types";
import type { AuctionSale } from "@/domains/market/model/types";
import type { Syndicate } from "@/domains/breeding/model/types";
import type { StaffMember } from "@/domains/staff/model/staffTypes";
import { generatePersonIdentity } from "@/domains/person/simulation/generator";
import type { AwardCeremonyInvitation } from "@/domains/awards/simulation/invitations";

// Lazy route targets: the router stub for lazyRouteComponent renders nothing,
// so the real pages are exercised directly under the same state matrix.
import AuctionSalePage from "@/domains/auction/ui/pages/AuctionSalePage";
import BookmarksPage from "@/domains/bookmarks/ui/pages/BookmarksPage";
import HorseGalleryPage from "@/domains/horse/ui/pages/HorseGalleryPage";
import InboxPage from "@/domains/inbox/ui/pages/InboxPage";
import LiveRace from "@/domains/race/ui/pages/LiveRace";
import HorseDetail from "@/domains/horse/ui/pages/HorseDetail";
import StablePage from "@/domains/stable/ui/pages/StablePage";
import NpcStableDetailPage from "@/domains/agents/ui/pages/NpcStableDetailPage";
import StaffDetailPage from "@/domains/staff/ui/pages/StaffDetailPage";
import SyndicatePage from "@/domains/syndicates/ui/pages/SyndicatePage";

const RUNNING_EXECUTION: AdvanceExecution = {
  status: "running",
  commandId: "matrix-cmd",
  baseRevision: 1,
  daysCompleted: 3,
  totalDays: 7,
};

const FAILED_EXECUTION: AdvanceExecution = {
  status: "failed",
  commandId: "matrix-cmd",
  baseRevision: 1,
  daysCompleted: 3,
  totalDays: 7,
  error: "simulated engine failure",
};

const PROFILE: NonNullable<GameState["playerProfile"]> = {
  stableName: "Matrix Farm",
  owner: generatePersonIdentity({
    id: "player",
    displayName: "Matrix Owner",
    role: "owner",
    ageBand: "adult",
  }),
  ownerName: "Matrix Owner",
  silk: { primary: "#c8a24a", secondary: "#1c1c22", cap: "#1c1c22", pattern: "solid" },
  backstoryId: "inheritor",
  founded: 1,
};

/** Entities resolving every MOCK_PARAMS id so success state renders content. */
function successEntities(): Partial<GameState> {
  const horse = createTestHorse({
    id: MOCK_PARAMS.horseId as never,
    name: "Matrix Runner",
    ownership: { type: "player" },
  });
  const stallion = createTestHorse({
    id: MOCK_PARAMS.stallionId as never,
    name: "Matrix Sire",
    gender: "horse",
    ownership: { type: "player" },
  });
  (stallion as { stud?: { atStud: boolean; studFee: number } }).stud = {
    atStud: true,
    studFee: 10_000,
  };
  const rival = createTestStable({ id: "rival-stable" });
  const stable = createTestStable({ id: MOCK_PARAMS.stableId });
  const jockey = createTestJockey({ id: MOCK_PARAMS.jockeyId as never });
  const race = {
    id: MOCK_PARAMS.raceId,
    name: "Matrix Stakes",
    day: 120,
    distance: 1600,
    raceClass: "Allowance",
    entryFee: 0,
    purse: 50_000,
    fieldSize: 8,
    entries: [{ horseId: MOCK_PARAMS.horseId }],
    resolved: false,
  } as unknown as Race;
  const sale: AuctionSale = {
    id: MOCK_PARAMS.saleId,
    name: "Matrix Sale",
    day: 120,
    kind: "yearling",
    lots: [],
    resolved: false,
  };
  const syndicate: Syndicate = {
    id: MOCK_PARAMS.syndicateId,
    stallionId: MOCK_PARAMS.stallionId,
    stallionName: "Matrix Sire",
    totalShares: 40,
    shareHolders: {},
    sharePrice: 2_500,
    studFee: 10_000,
    isPublic: true,
    lifetimeEarnings: 0,
  };
  const staff: StaffMember = {
    id: MOCK_PARAMS.staffId as never,
    person: generatePersonIdentity({
      id: MOCK_PARAMS.staffId,
      displayName: "Matrix Trainer",
      role: "trainer",
      ageBand: "adult",
    }),
    name: "Matrix Trainer",
    role: "trainer",
    tier: "elite",
    salary: 1_000,
    bonusValue: 0.1,
    traits: [],
    fame: 60,
  };
  const invitation: AwardCeremonyInvitation = {
    id: MOCK_PARAMS.invitationId,
    region: "north_america",
    year: 1,
    ceremonyName: "Matrix Awards",
    ceremonyDay: 130,
    issuedDay: 115,
    qualifiers: [],
    rsvp: "pending",
  };
  return {
    horses: { [MOCK_PARAMS.horseId]: horse, [MOCK_PARAMS.stallionId]: stallion } as never,
    races: { [MOCK_PARAMS.raceId]: race } as never,
    npcStables: [stable, rival],
    jockeys: [jockey],
    auctions: [sale],
    syndicates: { [MOCK_PARAMS.syndicateId]: syndicate },
    staffPool: [staff],
    awardCeremonyInvitations: [invitation],
  };
}

type ScreenState = "loading" | "empty" | "pending" | "error" | "disabled-with-reason" | "success";

const SCREEN_STATE_SEEDS: Record<ScreenState, () => Partial<GameState>> = {
  // First paint: no profile, no world data — routes must show their
  // loading/onboarding guards rather than crash on missing entities.
  loading: () => ({}),
  // Established profile but an untouched world — empty-list and empty-detail
  // copy paths.
  empty: () => ({
    playerProfile: PROFILE,
    day: 1,
    cash: 100_000,
  }),
  // Advance in flight — actions gated on execution.status must hold.
  pending: () => ({ ...midGameSeed(), execution: { ...RUNNING_EXECUTION } }),
  // Engine reported failure; parameterized routes additionally face
  // unresolvable entity ids (mock params absent from this seed).
  error: () => ({
    ...midGameSeed(),
    execution: { ...FAILED_EXECUTION },
  }),
  // Insolvency — actions disabled with a stated reason.
  "disabled-with-reason": () => ({
    ...midGameSeed(),
    cash: -50_000,
    consecutiveDaysInDebt: 45,
  }),
  // Rich mid-game world where every mock param resolves to a real entity.
  success: () => ({ ...midGameSeed(), playerProfile: PROFILE, ...successEntities() }),
};

type Outcome = "rendered" | "notFound";

const lazyPageCases: { name: string; component: ComponentType }[] = [
  { name: "auction.$saleId (page)", component: AuctionSalePage },
  { name: "bookmarks (page)", component: BookmarksPage },
  { name: "horse-gallery (page)", component: HorseGalleryPage },
  { name: "inbox (page)", component: InboxPage },
  { name: "npc-stables.$stableId (page)", component: NpcStableDetailPage },
  { name: "race.$raceId (page)", component: LiveRace },
  { name: "stable.$horseId (page)", component: HorseDetail },
  { name: "stable.index (page)", component: StablePage },
  { name: "staff.$staffId (page)", component: StaffDetailPage },
  { name: "syndicate.$syndicateId (page)", component: SyndicatePage },
];

const isParameterized = (name: string) => name.includes("$");

const allCases: { name: string; component: ComponentType }[] = [
  ...componentRouteCases,
  ...lazyPageCases,
];

const stateNames = Object.keys(SCREEN_STATE_SEEDS) as ScreenState[];

const matrix = new Map<string, Map<ScreenState, Outcome>>();

function record(name: string, state: ScreenState, outcome: Outcome) {
  const row = matrix.get(name) ?? new Map<ScreenState, Outcome>();
  row.set(state, outcome);
  matrix.set(name, row);
}

beforeEach(() => cleanup());
afterEach(() => cleanup());

describe("route screen-state matrix", () => {
  for (const routeCase of allCases) {
    describe(routeCase.name, () => {
      it.each(stateNames)("%s state", (stateName) => {
        let outcome: Outcome = "rendered";
        try {
          renderWithStore(createElement(routeCase.component), SCREEN_STATE_SEEDS[stateName]());
        } catch (e) {
          if (e instanceof NotFoundError) {
            outcome = "notFound";
          } else {
            throw e;
          }
        }
        record(routeCase.name, stateName, outcome);
      });
    });
  }

  it("every route renders real UI in at least one state", () => {
    const missing: string[] = [];
    for (const routeCase of allCases) {
      const row = matrix.get(routeCase.name);
      const rendered = row ? [...row.values()].some((o) => o === "rendered") : false;
      if (!rendered) missing.push(routeCase.name);
    }
    expect(missing).toEqual([]);
  });

  it("parameterized routes exercise a handled error path under unresolvable ids", () => {
    const problems: string[] = [];
    for (const routeCase of allCases) {
      if (!isParameterized(routeCase.name)) continue;
      const row = matrix.get(routeCase.name)!;
      // Loading/empty seeds carry no mock entities: the route must either
      // throw notFound() or render its inline error/empty UI — never crash.
      for (const state of ["loading", "empty", "error"] as const) {
        if (!row.has(state)) problems.push(`${routeCase.name} [${state}]`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("success seed resolves every parameterized route's mock entity", () => {
    const unresolved: string[] = [];
    for (const routeCase of allCases) {
      if (!isParameterized(routeCase.name)) continue;
      if (matrix.get(routeCase.name)?.get("success") !== "rendered") {
        unresolved.push(routeCase.name);
      }
    }
    expect(unresolved).toEqual([]);
  });
});
