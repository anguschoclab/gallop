---
name: Auction Theater Improvements
description: Re-raise proxy bids, bid history panel, visual feedback improvements
type: feature
status: Approved
---

# Auction Theater Improvements

## Overview

Three targeted improvements to the live auction theater UI and runner. Each section is independently shippable; they share no runtime coupling.

| ID  | Name                                                       | Surface                                   |
| --- | ---------------------------------------------------------- | ----------------------------------------- |
| Aa  | Max bid re-raise (proxy)                                   | `auctionRunner.ts` + `AuctionTheater.tsx` |
| Ab  | Bid history panel                                          | `AuctionTheater.tsx`                      |
| Ac  | Visual feedback (phase strip, leading banner, win overlay) | `AuctionTheater.tsx`                      |

---

## Affected Files

- `src/game/auctionRunner.ts` — runner step logic (Aa only)
- `src/components/auction/AuctionTheater.tsx` — all three sections

No store changes. No new routes. No new services.

---

## Aa — Max Bid Re-Raise (Proxy Bidding)

### Current Behavior

`onMaxBidSubmit` computes `Math.min(cap, nextBidAmount(currentBid))` and calls `placeBid` once. The cap is then discarded. If an NPC outbids the player afterward, the proxy does not re-raise.

### Target Behavior

The player sets a cap. The runner automatically re-raises on the player's behalf whenever an NPC outbids, up to the cap, before the auctioneer advances to `going_once`. If the player's cash is insufficient for an auto-raise, the proxy is cancelled with an error message.

---

### Data Model Changes

#### `auctionRunner.ts` — internal state only

Add one field to the closure (not to `LotState`, not persisted):

```ts
let playerMaxBid: number | undefined = undefined;
```

Add a setter exposed on `AuctionRunner`:

```ts
setPlayerMaxBid(cap: number | undefined): void;
```

Update the `AuctionRunner` type accordingly:

```ts
export type AuctionRunner = {
  // ... existing members ...
  setPlayerMaxBid(cap: number | undefined): void;
};
```

No changes to `AuctionLot`, `LotState`, `AuctionTickEvent`, or the store.

---

### Runner Changes (`step`)

Inside the `step` function, after `tryNpcRaise` returns a non-null event (i.e., an NPC has just outbid the player), insert the auto-raise check **before** emitting the NPC event or allowing the chant to advance:

```
if (npcEv) {
  const npcBid = /* amount from npcEv */;
  const nextForPlayer = nextBidAmount(npcBid);

  if (
    playerMaxBid !== undefined &&
    nextForPlayer <= playerMaxBid &&
    state.leadingBidder !== undefined  // NPC is now leading
  ) {
    // Attempt auto-raise. Cash check is caller's responsibility via
    // an injected callback (see Theater integration below).
    const autoEv = tryRecordPlayerBid(state, nextForPlayer);
    if (autoEv) {
      events.push(npcEv);       // NPC raise first
      events.push(autoEv);      // player re-raise immediately after
      return { events, done, currentLotIndex: lotIndex };
    }
    // If tryRecordPlayerBid fails (amount <= currentBid shouldn't happen
    // here but guard anyway), fall through to normal flow.
  }

  events.push(npcEv);
  // ... existing BID_WAR detection ...
}
```

**Cash enforcement**: The runner cannot directly call `debitForLiveBid` (store action lives in the Theater). Instead, expose a callback option on `AuctionRunnerOptions`:

```ts
export type AuctionRunnerOptions = {
  liveMode?: boolean;
  npcAIManager?: NpcAIManager;
  currentDay?: number;
  /** Called before each auto-raise to debit cash. Return false to abort. */
  onAutoRaise?: (amount: number) => boolean;
};
```

Inside the auto-raise block, call `onAutoRaise(nextForPlayer)` before `tryRecordPlayerBid`. If it returns `false`, call `setPlayerMaxBid(undefined)` to cancel the proxy and emit no player event for this tick.

---

### Theater Changes (`AuctionTheater.tsx`)

#### State

```ts
const [playerMaxBid, setPlayerMaxBidState] = useState<number | undefined>(undefined);
```

The runner's `setPlayerMaxBid` is a ref-stable setter; call it in sync whenever `playerMaxBidState` changes via `useEffect`.

#### Runner Initialization

Pass `onAutoRaise` when constructing the runner:

```ts
createAuctionRunner(sale, stables, horses, hashStr(sale.id), {
  liveMode: true,
  onAutoRaise: (amount) => {
    const result = debitForLiveBid(amount);
    if (!result.ok) {
      setPlayerMaxBidState(undefined);
      setBidError(`Auto-bid cancelled: ${result.reason}`);
      return false;
    }
    return true;
  },
});
```

#### `onMaxBidSubmit`

Replace current implementation:

```ts
const onMaxBidSubmit = () => {
  const cap = Number(maxBid.replace(/[\$,]/g, ""));
  if (!cap || isNaN(cap) || cap <= currentBid) {
    setBidError("Max bid must exceed current price.");
    return;
  }
  setPlayerMaxBidState(cap);
  runnerRef.current?.setPlayerMaxBid(cap);
  setMaxBid("");
  // Immediately place the opening bid at the next increment if player is not leading.
  if (!playerIsLeading) {
    const opening = Math.min(cap, nextBidAmount(currentBid));
    placeBid(opening);
  }
};
```

#### Cancel Proxy

Add a cancel handler:

```ts
const onCancelMaxBid = () => {
  setPlayerMaxBidState(undefined);
  runnerRef.current?.setPlayerMaxBid(undefined);
};
```

#### Auto-bid Chip (UI)

Render inside the bidding panel, below the action bar, when `playerMaxBidState` is set:

```tsx
{
  playerMaxBidState !== undefined && (
    <div className="flex items-center gap-2 rounded-md bg-primary/10 border border-primary/30 px-3 py-1.5 text-sm">
      <span className="flex-1">Auto-bidding · cap ${playerMaxBidState.toLocaleString()}</span>
      <button
        onClick={onCancelMaxBid}
        className="text-muted-foreground hover:text-destructive transition-colors"
        aria-label="Cancel auto-bid"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
```

#### Lot Transition

Clear `playerMaxBidState` (and sync to runner) whenever `currentLot?.id` changes. The runner already resets to a fresh `LotState` per lot; `playerMaxBid` closure var must also reset at lot boundaries. Add inside the lot-advance path:

```ts
// In stepAndRender, when lotIndex advances (detect via result.currentLotIndex change):
if (result.currentLotIndex !== prevLotIndexRef.current) {
  setPlayerMaxBidState(undefined);
  runnerRef.current?.setPlayerMaxBid(undefined);
  prevLotIndexRef.current = result.currentLotIndex;
}
```

Use a `prevLotIndexRef` ref initialized to `0`.

---

### Edge Cases — Aa

| Scenario                                          | Behavior                                                                                                                                       |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Player sets cap below `nextBidAmount(currentBid)` | Reject with `"Max bid must exceed current price."`                                                                                             |
| NPC raises to exactly `playerMaxBid`              | `nextBidAmount(playerMaxBid) > playerMaxBid` so no auto-raise fires; proxy stays armed at cap (player leading, so no NPC re-raise triggers it) |
| NPC raises above `playerMaxBid`                   | `nextForPlayer > playerMaxBid` → no auto-raise; proxy cancelled silently (cap exhausted)                                                       |
| Cash insufficient for auto-raise                  | `onAutoRaise` returns `false`; proxy cancelled; bidError shown                                                                                 |
| Player already leading when proxy is set          | Chip shown; auto-raise only fires on next NPC outbid                                                                                           |
| Lot sold before proxy triggers                    | Proxy is irrelevant; cleared on lot transition                                                                                                 |
| `onSkipToResults` called while proxy is set       | `runToCompletion` does not call `onAutoRaise`; proxy has no effect on offline path                                                             |

---

## Ab — Bid History Panel

### Target Behavior

A collapsible drawer inside the lot card showing the complete bid history for the current lot, updated live each tick. Closed by default.

### State

```ts
const [historyOpen, setHistoryOpen] = useState(false);
```

Reset to `false` on lot transition (same `prevLotIndexRef` check used in Aa).

### Data Source

`LotState.bidHistory` is maintained by the runner on every bid. Expose it on the `currentLot()` return type:

```ts
// In auctionRunner.ts, currentLot():
return {
  lot: state.lot,
  horse,
  currentBid: state.currentBid,
  leadingBidder: state.leadingBidder,
  chant: state.chant,
  nextBid: nextBidAmount(state.currentBid),
  bidHistory: state.bidHistory, // ADD
};
```

Update the `AuctionRunner.currentLot()` return type union to include `bidHistory: AuctionBidRecord[]`.

### Placement

Inside the lot `CardContent`, in the lot header row (where horse name and badges appear), add a "History" toggle button aligned right:

```tsx
<button
  onClick={() => setHistoryOpen((o) => !o)}
  className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
  aria-expanded={historyOpen}
  aria-controls="bid-history-panel"
>
  History {historyOpen ? "▲" : "▼"}
</button>
```

### Panel Content

Render immediately below the horse header block, before the stats grid, when `historyOpen`:

```tsx
{
  historyOpen && (
    <div
      id="bid-history-panel"
      className="rounded-md border bg-muted/30 p-2 space-y-0.5 max-h-40 overflow-y-auto"
    >
      {bidHistory.length === 0 ? (
        <p className="text-xs text-muted-foreground italic text-center py-2">No bids yet</p>
      ) : (
        [...bidHistory].reverse().map((record, idx) => {
          const label =
            record.stableId === undefined
              ? "YOU"
              : (stables.find((s) => s.id === record.stableId)?.name ?? record.stableId);
          return (
            <div key={idx} className="flex items-baseline justify-between text-xs gap-3">
              <span
                className={cn(
                  "font-medium truncate",
                  record.stableId === undefined && "text-primary",
                )}
              >
                {label}
              </span>
              <span className="tabular-nums text-right shrink-0">
                ${record.amount.toLocaleString()}
              </span>
              <span className="tabular-nums text-muted-foreground shrink-0 text-[10px]">
                t{record.tick}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
```

`bidHistory` is read from `lotState?.bidHistory ?? []`. Because `forceTick()` is called after every `step`, the panel re-renders each tick automatically.

---

### Edge Cases — Ab

| Scenario                            | Behavior                                                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lot transitions while panel is open | `historyOpen` resets to `false`; new lot opens with panel closed                                                                                                   |
| NPC stable not found in `stables`   | Fall back to raw `stableId` string                                                                                                                                 |
| Panel open during `onSkipToResults` | Runner advances to done; `forceTick` not called; panel shows stale history. Acceptable — panel is hidden once `done && committed` transitions to `PostSaleSummary` |
| Zero bids on a passed lot           | "No bids yet" empty state                                                                                                                                          |

---

## Ac — Visual Feedback

Three independent sub-features. All changes are confined to `AuctionTheater.tsx`.

---

### Ac-1 — Phase Strip

A horizontal progress strip rendered above the lot card showing the five auction phases.

#### Phases and Mapping

```ts
const PHASES: { key: ChantPhase | "sold_passed"; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "bidding", label: "Bidding" },
  { key: "going_once", label: "Going Once" },
  { key: "going_twice", label: "Going Twice" },
  { key: "sold_passed", label: "Sold / Passed" },
];
```

Map `lotState?.chant` to the strip: `"sold"` and `"passed"` both map to index 4 (`"sold_passed"`).

#### Rendering

Place the strip as the first child of the lot `Card`, before `CardContent`, spanning the full card width:

```tsx
<div className="flex rounded-t-lg overflow-hidden" aria-label="Auction phase">
  {PHASES.map((phase, idx) => {
    const activeIdx = chantToPhaseIndex(lotState?.chant);
    const isActive = idx === activeIdx;
    const isDone = idx < activeIdx;
    return (
      <div
        key={phase.key}
        className={cn(
          "flex-1 py-1 text-center text-[10px] font-medium uppercase tracking-wide transition-colors duration-300",
          isActive && "bg-warning text-warning-foreground",
          isDone && "bg-warning/25 text-warning-foreground/60",
          !isActive && !isDone && "bg-muted text-muted-foreground",
        )}
      >
        {phase.label}
      </div>
    );
  })}
</div>
```

The left-fill animation is achieved via `transition-colors duration-300` on each segment. No CSS keyframes required — color transitions on each segment as `activeIdx` advances.

`chantToPhaseIndex`:

```ts
function chantToPhaseIndex(chant: ChantPhase | undefined): number {
  switch (chant) {
    case "open":
      return 0;
    case "bidding":
      return 1;
    case "going_once":
      return 2;
    case "going_twice":
      return 3;
    case "sold":
    case "passed":
      return 4;
    default:
      return 0;
  }
}
```

---

### Ac-2 — Leading Banner

Replace the current "Leader" label row (a small `text-xs text-muted-foreground` line inside the bidding panel) with a prominent banner.

#### State

```ts
const [bannerFlash, setBannerFlash] = useState(false);
```

Track the previous leading state to detect changes:

```ts
const prevLeadingRef = useRef<boolean | undefined>(undefined);

// Inside stepAndRender, after forceTick():
const newLeading = /* recompute playerIsLeading from updated runner state */;
if (prevLeadingRef.current !== undefined && prevLeadingRef.current !== newLeading) {
  setBannerFlash(true);
  setTimeout(() => setBannerFlash(false), 150);
}
prevLeadingRef.current = newLeading;
```

#### Rendering

Remove the existing leader label row. Insert the banner directly below the current bid amount display, inside the bidding panel:

```tsx
{
  currentBid > 0 && (
    <div
      className={cn(
        "rounded px-3 py-1.5 text-center text-sm font-bold uppercase tracking-wider transition-colors",
        playerIsLeading
          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
          : "bg-amber-500/20 text-amber-400 border border-amber-500/40",
        bannerFlash && "opacity-0",
      )}
    >
      {playerIsLeading
        ? "You're Leading"
        : leadingBidder
          ? `Outbid by ${stables.find((s) => s.id === leadingBidder)?.name ?? "NPC"}`
          : "—"}
    </div>
  );
}
```

The flash is a 150ms `opacity-0` → `opacity-100` toggle. Because Tailwind transitions apply on class removal, the banner briefly disappears then snaps back. No animation library required. Add `transition-opacity duration-150` to the className.

Hide the banner entirely when `currentBid === 0` (lot just opened, no bids placed) or when `lotState?.chant === "open"`.

---

### Ac-3 — Win Overlay

When a `SOLD` event fires and the winner is the player (`toStableId === undefined`), show a full-card overlay on top of the lot card before auto-advancing.

#### State

```ts
const [winOverlay, setWinOverlay] = useState<{
  horseName: string;
  hammerPrice: number;
} | null>(null);
```

#### Trigger

Inside `stepAndRender`, in the event loop:

```ts
if (event.type === "SOLD" && event.toStableId === undefined) {
  const horse = horses.find((h) => h.id === currentLot?.horseId);
  setWinOverlay({
    horseName: horse?.name ?? "Horse",
    hammerPrice: event.amount,
  });
}
```

#### Auto-dismiss

The overlay auto-clears after 2500ms and advances naturally (the lot transition happens via `done` state or the next tick). Implement with `setTimeout` inside the `winOverlay` setter call:

```ts
setTimeout(() => setWinOverlay(null), 2500);
```

A keypress also clears it: in the existing keyboard handler, add:

```ts
if (winOverlay) {
  setWinOverlay(null);
  return;
}
```

#### Rendering

Overlay the lot card using absolute positioning inside the `Card` wrapper. The `Card` must have `relative` in its className:

```tsx
{
  winOverlay && (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-background/90 backdrop-blur-sm animate-in fade-in duration-300"
      role="status"
      aria-live="polite"
    >
      <p className="text-5xl font-black tracking-tight text-emerald-400 uppercase">Acquired</p>
      <p className="mt-2 text-xl font-semibold">{winOverlay.horseName}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">
        ${winOverlay.hammerPrice.toLocaleString()}
      </p>
      <p className="mt-4 text-xs text-muted-foreground">Press any key or wait to continue…</p>
    </div>
  );
}
```

#### Clearing on Lot Transition

Clear `winOverlay` in the lot-transition block alongside the other per-lot resets:

```ts
if (result.currentLotIndex !== prevLotIndexRef.current) {
  setWinOverlay(null);
  // ... other resets
}
```

---

### Edge Cases — Ac

| Scenario                                                                   | Behavior                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Player wins a consignment lot (no real win)                                | `event.toStableId === undefined` only on non-consignment lots where `soldToStableId` is undefined — consignments set `consignorStableId = undefined` on the lot, not `soldToStableId`. The SOLD event's `toStableId` correctly reflects the buyer, not the consignor. Overlay fires only when `toStableId === undefined`. |
| `onSkipToResults` — player won a lot offline                               | `runToCompletion` is synchronous; events are not dispatched through `stepAndRender`; win overlay does not fire. Correct — the offline path shows the post-sale summary directly.                                                                                                                                          |
| Banner when chant is "open" (no bids)                                      | Hidden (`currentBid === 0` guard).                                                                                                                                                                                                                                                                                        |
| Phase strip when `done` is true but `PostSaleSummary` has not rendered yet | `lotState` is `undefined` after the final lot advances. `chantToPhaseIndex(undefined)` returns `0`. Strip shows "Open" highlighted, which is moot — the sale-concluded placeholder renders instead.                                                                                                                       |
| Win overlay keypress conflicts with Space bid                              | The keyboard handler returns early when `winOverlay` is set (see Ac-3 trigger section), preventing a double bid.                                                                                                                                                                                                          |
| Multiple SOLD events in one step (shouldn't happen)                        | `stepAndRender` iterates events sequentially; `setWinOverlay` is called for the last matching event. In practice the runner emits at most one SOLD per step.                                                                                                                                                              |

---

## Testing Notes

- **Aa**: Set a max bid of $X, confirm NPC outbid triggers auto-raise up to X. Confirm auto-raise stops when cap reached. Confirm `bidError` appears and chip disappears when cash runs out mid-session. Confirm proxy clears on lot transition. Confirm offline path (`runToCompletion`) is unaffected.
- **Ab**: Open the panel at various phases (zero bids, mid-bidding, post-sold). Confirm newest-first order. Confirm "YOU" label on player bids. Confirm panel closes on lot transition.
- **Ac-1**: Step through a full lot from open → sold. Confirm each phase segment activates in sequence. Confirm `passed` activates the final segment identically to `sold`.
- **Ac-2**: Place a winning bid, confirm emerald banner. Let an NPC outbid, confirm amber banner. Confirm 150ms flash on state change. Confirm banner hidden at `currentBid === 0`.
- **Ac-3**: Win a lot as the player buyer. Confirm overlay appears with horse name and price. Confirm overlay dismisses on keypress and after 2500ms. Confirm overlay does not appear when an NPC wins. Confirm `onSkipToResults` does not show overlay.
