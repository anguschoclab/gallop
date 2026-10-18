import type { Horse } from "@/platform/game/types";
import { DAYS_PER_YEAR, DAYS_PER_MONTH, DAYS_PER_WEEK } from "@/domains/calendar/model/calendarConstants";
import { UPKEEP_PER_HORSE } from "@/domains/market/model/economicConstants";
import { getEngineClient, initEngineClient } from "@/platform/game/store/engineClient";
import { clearLineageCache } from "@/domains/breeding/simulation/lineage";
import type { StoreSet, StoreGet, StoreType } from "@/platform/game/store/types";
import type { CoreSlice } from "@/platform/game/store/slices/coreSlice";
import { isPlayerOwned } from "@/domains/horse/simulation/ownership";
import { asRaceId } from "@/shared/types/branded";
import { IDLE_EXECUTION } from "@/platform/game/store/state/systemsState";
import type { GameState } from "@/platform/game/types";
import { PostCommitDispatcher, postCommitId } from "@/platform/game/store/postCommit";
import { engineWorldSynced, noteCommittedWorld } from "@/platform/game/store/engineSync";

/**
 * Extract a structured-cloneable GameState snapshot from the store — action
 * functions are stripped so the payload survives postMessage to the worker.
 * Session/bookkeeping keys are also stripped: they are store-only state the
 * engine neither owns nor should transport.
 * @param s
 */
export function snapshotState(s: StoreType): GameState {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) {
    if (typeof v === "function") continue;
    if (
      k === "execution" ||
      k === "engineRevision" ||
      k === "engineGeneration" ||
      k === "lastFrameTime"
    )
      continue;
    out[k] = v;
  }
  return out as unknown as GameState;
}

export function createAdvanceDayActions(
  set: StoreSet,
  get: StoreGet,
): Pick<
  CoreSlice,
  | "advanceDay"
  | "advanceMultipleDays"
  | "advanceWeek"
  | "advanceMonth"
  | "advanceYear"
  | "cancelAdvance"
> {
  // Typed idempotent post-commit effects, keyed by committed revision.
  // A duplicated or late terminal result re-dispatching the same revision
  // replays nothing; a failed handler retries on the next dispatch of the
  // same event id.
  const postCommit = new PostCommitDispatcher();
  postCommit.on("scouting", () => {
    (get() as StoreType).runScoutingAssignments?.();
  });
  postCommit.on("autoSyndicate", () => {
    const s = get() as StoreType;
    if (s.autoSyndicateEnabled) s.runAutoSyndicate?.();
  });
  postCommit.on("exchange", () => {
    (get() as StoreType).refreshExchange?.();
  });
  postCommit.on("marketAlerts", (e) => {
    (get() as StoreType).evaluateMarketAlerts?.(e.payload as number);
  });
  postCommit.on("tutorial", () => {
    (get() as StoreType).completeTutorialBeat?.(4);
  });

  const applyDayResult = (
    finalState: Partial<StoreType>,
    newLogs: { day: number; text: string }[],
    playerUpkeep: number,
    newDay: number,
    engineRevision: number,
  ) => {
    const s = get();

    // Committed state already carries day/pendingIntents/trainingUsed from
    // finalization — overriding them here would only break object identity
    // with the engine's retained world. The log override is real store-side
    // enrichment (phase lines + upkeep), and `log` is excluded from the
    // world-sync check for exactly that reason.
    const overrides = {
      engineRevision,
      log: [
        ...newLogs,
        { day: newDay, text: `Day ${newDay} begins. Upkeep: $${playerUpkeep}.` },
        ...s.log,
      ].slice(0, 1000),
    };

    const update: Record<string, unknown> = { ...finalState, ...overrides };

    delete update.lastFrameTime;
    delete update.execution;

    clearLineageCache();
    set(update as Partial<StoreType>);

    // Standing scouting assignments dispatch scouts for the new day;
    // auto-syndication of top stallions; rival stables post asks/bids and
    // settle NPC trades; market alerts sweep fills across every intermediate
    // day of a batch; tutorial beat 4 fires on advancement. All are
    // exactly-once per committed revision.
    postCommit.dispatch({
      id: postCommitId("scouting", engineRevision),
      kind: "scouting",
      revision: engineRevision,
      day: newDay,
    });
    postCommit.dispatch({
      id: postCommitId("autoSyndicate", engineRevision),
      kind: "autoSyndicate",
      revision: engineRevision,
      day: newDay,
    });
    postCommit.dispatch({
      id: postCommitId("exchange", engineRevision),
      kind: "exchange",
      revision: engineRevision,
      day: newDay,
    });
    postCommit.dispatch({
      id: postCommitId("marketAlerts", engineRevision),
      kind: "marketAlerts",
      revision: engineRevision,
      day: newDay,
      payload: s.day,
    });
    postCommit.dispatch({
      id: postCommitId("tutorial", engineRevision),
      kind: "tutorial",
      revision: engineRevision,
      day: newDay,
    });
  };

  /**
   * Submit an advance command to the engine and apply the terminal result.
   * Commits are compare-and-swap: a result whose engineRevision does not
   * extend the store's committed revision — or which was issued under an
   * older generation — is discarded.
   * @param n
   * @param headless
   * @param progressCallback
   */
  const submitAdvance = async (
    n: number,
    headless: boolean,
    progressCallback?: (day: number, totalDays: number) => void,
  ) => {
    const s = get();
    // One active mutating command: a second advance submitted while one is
    // in flight would snapshot stale pre-commit state and regress the store.
    // The engine queue is a protocol fallback, not an invitation to submit
    // concurrent advances.
    const running = s.execution?.status;
    if (running === "running" || running === "cancelling") return;
    const generation = s.engineGeneration ?? 0;
    const submittedDay = s.day;

    set({
      execution: {
        status: "running",
        baseRevision: s.engineRevision ?? 0,
        daysCompleted: 0,
        totalDays: n,
      },
    });

    try {
      await initEngineClient();
      const client = getEngineClient();
      // Read-model publication is capped at 10 Hz — progress events arrive
      // per simulated day and would otherwise re-render faster than frames.
      // Terminal/interruption feedback is never throttled.
      let lastProgressPublish = 0;
      client.onProgress((e) => {
        const now = Date.now();
        if (now - lastProgressPublish >= 100) {
          lastProgressPublish = now;
          const ex = get().execution;
          if (ex?.status === "running") {
            set({
              execution: { ...ex, daysCompleted: e.daysCompleted, totalDays: e.totalDays },
            });
          }
        }
        progressCallback?.(e.daysCompleted, e.totalDays);
      });

      // The engine retains its committed world between commands — send a
      // full snapshot only when the store has diverged (first command after
      // load/new-game, or any store-side mutation since the last commit).
      let result = await client.submit({
        days: n,
        headless,
        state: engineWorldSynced(s) ? undefined : snapshotState(s),
      });

      // A stale base revision means engine authority drifted (transport
      // restart): rebase it to the store's revision via loadWorld, then
      // retry once.
      if (result.status === "rejected" && result.reason === "stale_base_revision") {
        const snap = snapshotState(get());
        const load = await client.submit({
          kind: "loadWorld",
          state: snap,
          baseRevision: get().engineRevision ?? 0,
        });
        if (load.status === "loaded") {
          noteCommittedWorld(snap);
          result = await client.submit({ days: n, headless });
        }
      }

      // CAS guard: superseded generation or non-advancing revision → drop.
      const current = get();
      if ((current.engineGeneration ?? 0) !== generation) return;
      if (result.status === "rejected") {
        console.warn(`[advance] command rejected: ${result.reason}`);
        return;
      }
      if (result.status === "resolved") return; // resolveLiveRace results commit elsewhere
      if (result.status === "loaded") return; // only reachable via a loadWorld submit
      if (result.revision <= (current.engineRevision ?? 0)) {
        console.warn(
          `[advance] dropping stale result revision ${result.revision} <= ${current.engineRevision}`,
        );
        // The engine committed a revision the store already passed — its
        // authority is behind ours (e.g. a restarted transport re-committed
        // from rev 0). Rebase it to the store's world+revision so the next
        // advance chains instead of dropping every future commit.
        const snap = snapshotState(current);
        const rebase = await client.submit({
          kind: "loadWorld",
          state: snap,
          baseRevision: current.engineRevision ?? 0,
        });
        if (rebase.status === "loaded") noteCommittedWorld(snap);
        return;
      }

      const finalState = result.state;
      // The engine retains this committed world — subsequent commands can
      // omit state while the store's engine-owned fields stay identical.
      noteCommittedWorld(finalState);
      // The committed state's day is authoritative; fall back to the local
      // projection only if the engine omitted it.
      const finalDay =
        typeof finalState.day === "number" ? finalState.day : submittedDay + result.daysAdvanced;
      const playerHorseCount = Object.values(finalState.horses ?? {}).filter((h: Horse) =>
        isPlayerOwned(h),
      ).length;
      const playerUpkeep = playerHorseCount * UPKEEP_PER_HORSE;

      applyDayResult(finalState, result.logs, playerUpkeep, finalDay, result.revision);

      if (result.status === "interrupted") {
        console.info(
          `[advance] interrupted: ${result.daysAdvanced}/${n} days advanced, player race ${result.raceId} on day ${finalDay + 1}`,
        );
        set({
          execution: {
            status: "interrupted",
            daysCompleted: result.daysAdvanced,
            totalDays: n,
            interruptRaceId: asRaceId(result.raceId),
            remainingDays: n - result.daysAdvanced,
          },
        });
      }
    } catch (error) {
      // Engine failure: state remains at the last committed revision.
      const message = error instanceof Error ? error.message : String(error);
      console.warn("[advance] engine command failed:", message);
      set({
        execution: { status: "failed", error: message, daysCompleted: 0, totalDays: n },
      });
      // Try to recover the client for the next command.
      try {
        await initEngineClient();
      } catch {
        // Recovery failed — next submit will retry.
      }
    } finally {
      // Terminal transitions: interrupted/failed persist for the UI;
      // running/cancelling return to idle.
      const ex = get().execution;
      if (ex && (ex.status === "running" || ex.status === "cancelling")) {
        set({ execution: IDLE_EXECUTION });
      }
    }
  };

  return {
    advanceDay: async (progressCallback?: (stage: number, total: number, name: string) => void) => {
      const s = get();
      const newDay = s.day + 1;
      // Single-day calls share the same protocol; progress maps to the one
      // day-level step.
      await submitAdvance(1, true, (_day, _total) => {
        progressCallback?.(1, 1, `Day ${newDay}`);
      });
    },

    advanceMultipleDays: async (
      n: number,
      headless?: boolean,
      progressCallback?: (day: number, totalDays: number) => void,
    ) => {
      await submitAdvance(n, headless === true, progressCallback);
    },

    cancelAdvance: () => {
      const ex = get().execution;
      if (ex?.status === "running") {
        set({ execution: { ...ex, status: "cancelling" } });
      }
      // The terminal "cancelled" event commits partial progress and returns
      // the machine to idle via submitAdvance's finally.
      getEngineClient().cancel();
    },

    advanceWeek: async (headless?: boolean) => {
      await get().advanceMultipleDays(DAYS_PER_WEEK, headless);
    },

    advanceMonth: async (headless?: boolean) => {
      await get().advanceMultipleDays(DAYS_PER_MONTH, headless);
    },

    advanceYear: async (headless?: boolean) => {
      await get().advanceMultipleDays(DAYS_PER_YEAR, headless);
    },
  };
}
