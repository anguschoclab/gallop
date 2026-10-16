/**
 * postCommit.ts - Typed idempotent post-commit event dispatch.
 *
 * After an engine commit lands, follow-up effects (scouting assignments,
 * auto-syndication, exchange refresh, market alerts, tutorial beats, autosave)
 * must run exactly once per committed revision. The dispatcher keys every
 * effect by a stable event id (`kind:rev<revision>`), so:
 *
 * - a duplicated terminal result re-dispatching the same commit replays nothing;
 * - a handler failure leaves the event unprocessed — re-dispatching the same
 *   event id retries it, making handlers retry-safe;
 * - effects never block or fail the commit itself.
 */

export type PostCommitKind =
  "scouting" | "autoSyndicate" | "exchange" | "marketAlerts" | "tutorial" | "autosave";

export interface PostCommitEvent {
  /** Stable identity — a re-delivered commit with the same id is a no-op. */
  id: string;
  kind: PostCommitKind;
  /** Committed engine revision this effect belongs to. */
  revision: number;
  /** Committed day (context for handlers like market alerts). */
  day: number;
  /** Optional handler payload. */
  payload?: unknown;
}

export type PostCommitHandler = (event: PostCommitEvent) => void;

export type DispatchOutcome = "applied" | "skipped" | "failed" | "unhandled";

export class PostCommitDispatcher {
  private readonly handlers = new Map<PostCommitKind, PostCommitHandler>();
  private readonly processed = new Set<string>();

  /**
   * Register (or replace) the handler for a kind.
   * @param kind
   * @param handler
   */
  on(kind: PostCommitKind, handler: PostCommitHandler): void {
    this.handlers.set(kind, handler);
  }

  /**
   * True if this event id has already been applied successfully.
   * @param id
   */
  hasProcessed(id: string): boolean {
    return this.processed.has(id);
  }

  /**
   * Run the handler for `event` exactly once per event id. A throw is caught,
   * reported, and the event stays unprocessed so a later dispatch of the same
   * id retries it.
   * @param event
   */
  dispatch(event: PostCommitEvent): DispatchOutcome {
    if (this.processed.has(event.id)) return "skipped";
    const handler = this.handlers.get(event.kind);
    if (!handler) return "unhandled";
    try {
      handler(event);
      this.processed.add(event.id);
      return "applied";
    } catch (error) {
      console.error(`[postCommit] ${event.kind} handler failed for ${event.id}:`, error);
      return "failed";
    }
  }

  /** Test hook: clear all processed markers and handlers. */
  reset(): void {
    this.processed.clear();
    this.handlers.clear();
  }
}

/**
 * Build the stable event id for a commit-scoped effect.
 * @param kind
 * @param revision
 */
export function postCommitId(kind: PostCommitKind, revision: number): string {
  return `${kind}:rev${revision}`;
}
