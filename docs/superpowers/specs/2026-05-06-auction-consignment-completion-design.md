---
name: Auction Consignment Completion
description: Consignor theater view, post-sale results, pre-sale withdrawal
type: feature
status: Approved
---

# Auction Consignment Completion

## Overview

The consignment dialog (`ConsignDialog.tsx`) is complete: the player can select a sale, set a reserve, see the commission disclosure, and confirm. What is missing is everything that happens _after_ the player clicks Confirm — specifically:

- **B1** — Seeing their horse go through the ring in `AuctionTheater.tsx` as a _consignor_ rather than a bidder, with live proceeds tracking.
- **B2** — Reviewing itemised consignment results on the resolved sale page (`auction.$saleId.tsx`).
- **B3** — Withdrawing a consignment before sale day from the lot detail panel.

All three features rely on the existing convention that `AuctionLot.consignorStableId === undefined` identifies a player-consigned lot. No schema changes are required.

---

## Affected Files

| File                                        | Change type                                                                                    |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/components/auction/AuctionTheater.tsx` | Modify — B1 banner, scoreboard row, bid-control guard                                          |
| `src/routes/auction.$saleId.tsx`            | Modify — B2 consignment results section, B3 withdraw button                                    |
| `src/game/store/slices/marketSlice.ts`      | Modify — new `withdrawConsignment(saleId, lotId)` action replacing the old horse-keyed variant |

The existing `withdrawConsignment(horseId)` on `MarketSlice` already does the right thing internally (marks lot `withdrawn: true`, clears `horse.consignedSaleId`). B3 only needs a new _call site_ and a guard on sale day; no new store action is required unless the product wants lot-keyed addressing (see B3 detail).

---

## B1 — Consignor View in AuctionTheater

### Where

`src/components/auction/AuctionTheater.tsx`

### What the code already has

- `isPlayerConsignment` is already computed (`const isPlayerConsignment = !consignor && currentLot && !currentLot.consignorStableId`).
- It renders `"Your consignment"` in small green text inside the horse name block.
- `useScoreboard` already accumulates `sold` count and `netReceived` from player-consigned lots.
- The scoreboard strip shows a "Sold" cell with `sold · net $netReceived`.

### What is missing

**1a. "YOUR CONSIGNMENT" banner on the lot card**

The current label is a small `text-xs` line mixed into the metadata. It should be promoted to a distinct banner — visually separated from the "YOU'RE LEADING" bid status badge — so the player never confuses role (owner vs. bidder).

Placement: immediately below the horse name / gender row, before stats. Use a `Badge` with a distinct colour (e.g. `variant="outline"` with `border-success text-success` or a dedicated amber/gold tone to signal ownership rather than bid status, which uses green). Text: `YOUR CONSIGNMENT`.

Condition: `isPlayerConsignment && !done` (hide once the hammer has fallen for this lot; at that point the scoreboard and post-sale summary take over).

**1b. Scoreboard — dedicated "Proceeds" row**

The existing `ScoreboardStrip` merges sold count and net proceeds into a single "Sold" cell. Split these or add a fifth cell:

| Label    | Value                            |
| -------- | -------------------------------- |
| Proceeds | `$netReceived` accumulating live |

The `netReceived` figure in `useScoreboard` is already computed correctly via `netProceeds(lot.hammerPrice)` — only the display needs updating. The cell should only appear when `scoreboard.sold > 0`; hide it (or show `—`) otherwise to avoid visual noise on sales where the player has no consignments.

**1c. Disable bid controls on player-consigned lots**

When `isPlayerConsignment` is true, the player must not be able to place bids on their own horse. Currently the bid controls render unconditionally for every non-`done` lot.

Changes:

- Replace the primary `<Button>` "Bid $…" with a disabled button reading `"You consigned this lot"` (no gavel icon, neutral variant) when `isPlayerConsignment` is true.
- Hide the custom-bid and max-bid input rows entirely (they should not be reachable even by keyboard shortcut).
- Suppress the Space-bar handler for the duration of this lot: add `|| isPlayerConsignment` to the guard in the keyboard `handler` function.
- Show a short explanation line in place of the bid panel body: `"This horse is your consignment. Bidders are competing for it now."` styled as `text-sm text-muted-foreground text-center py-4`.

The "Pass" button (which steps the runner without a player bid) is acceptable to leave enabled — clicking it simply advances the auctioneer chant, which is fine.

---

## B2 — Post-Sale Consignment Results on `auction.$saleId.tsx`

### Where

`src/routes/auction.$saleId.tsx` — the `else` branch that renders the lot navigator and sale summary when `!isSaleDay || isResolved`.

### Current state

The resolved-sale view shows per-lot cards in the navigator and a compact `Sale Summary` card with aggregate counts. Player-consigned lots are identified inline with a small text note and an inline `"(gross · net $…)"` suffix on the sold-for line. There is no dedicated section grouping all player consignments.

### Design

Add a **"Your Consignments"** section that renders _before_ the lot navigator when `isResolved` is true and there is at least one player-consigned lot in the sale.

**Section header:** `<h2>Your Consignments</h2>` with appropriate sizing and a separator below.

**Per-lot result card** — one card per player-consigned lot (including passed lots):

```
┌──────────────────────────────────────────────────────────┐
│ [HorsePortrait sm]  Horse Name                [badge]    │
│                     Filly · Age 1 · Northern             │
│ ─────────────────────────────────────────────────────── │
│ Hammer price        $48,000           (or "Passed")      │
│ Commission (6%)     $2,880            (omit if passed)   │
│ Net proceeds        $45,120           (omit if passed)   │
│ Sold to             Westbrook Stables (or "Passed —       │
│                     reserve not met")                    │
└──────────────────────────────────────────────────────────┘
```

Specifics:

- **Badge**: `"Sold"` (success colour) or `"Passed"` (secondary/muted).
- **Hammer price**: `lot.hammerPrice` formatted with `$` and `,` separators. If `lot.passed`, show `"—"` in place of the price row and replace the commission/net rows with `"Reserve not met"` in muted text.
- **Commission**: `commissionAmount(lot.hammerPrice)` — import from `@/game/auction`. Already exported.
- **Net proceeds**: `netProceeds(lot.hammerPrice)` — already imported in the route.
- **Sold to**: `stables.find(s => s.id === lot.soldToStableId)?.name` or `"Passed"`.
- **HorsePortrait**: `size="sm"`. Horse looked up as normal from `horses`.

**Section footer (aggregate):** Below the per-lot cards, a summary row:

```
X horses sold · Total net proceeds: $Y  (after 6% commission)
```

Where X = sold lots count, Y = sum of `netProceeds(lot.hammerPrice)` across sold player lots. Only render if X > 0.

**Placement:** Above the existing lot navigator (`Lot 1 of N` header and `<Card>` per lot). This keeps the consignor story at the top and the bidder story (other lots the player may have bid on or browsed) below.

**Data derivation:**

```ts
const playerConsignedLots = activeLots.filter((l) => !l.consignorStableId);
// Only shown when isResolved && playerConsignedLots.length > 0
```

No new store selectors required — all data (`horses`, `stables`, `activeLots`) is already in scope in `AuctionSalePage`.

---

## B3 — Withdraw Consignment (Pre-Sale Day)

### Where

`src/routes/auction.$saleId.tsx` — inside the lot card for player-consigned lots, in the pre-sale-day lot navigator branch (i.e. `!isSaleDay && !isResolved`).

### Existing store action

`marketSlice.ts` already exports `withdrawConsignment(horseId: string)` which:

1. Finds the horse by ID.
2. Clears `horse.consignedSaleId`.
3. Marks the matching lot `withdrawn: true` (sets `lot.withdrawn = true` via `lots.map`).
4. Appends a log entry.

The signature `withdrawConsignment(horseId)` is sufficient — no new action is needed. The route already has `currentLot.horseId` in scope.

### UI changes in `auction.$saleId.tsx`

**Eligibility guard — show the withdraw button only when:**

- `isPlayerConsigned` (`!currentLot.consignorStableId`) is true.
- `!isResolved` — sale has not already run.
- `sale.day > day` — it is not yet sale day. (Equivalent to `!isSaleDay`, but checking `sale.day > day` is more explicit and safe against the equal case.)
- `!currentLot.withdrawn` — lot has not already been withdrawn.

**Button:** Place a `"Withdraw Consignment"` button below the consignor identification text, before the price/bid block. Use `variant="destructive"` with size `"sm"` and a `Trash2` icon from lucide-react.

**Confirmation dialog:** Wrap the button action in an `AlertDialog` (already available in `src/components/ui/alert-dialog.tsx`):

- **Title:** `"Withdraw consignment?"`
- **Description:** `"This will remove {horse.name} from {sale.name}. You will not receive any proceeds. This action cannot be undone."`
- **Cancel:** `"Keep consignment"` (default focus).
- **Confirm:** `"Withdraw"` (destructive).

**On confirm:**

```ts
const withdrawConsignment = useGame((s) => s.withdrawConsignment);
// ...
withdrawConsignment(currentLot.horseId);
// navigate back to lot 0 or show a toast; the lot disappears from activeLots
```

After withdrawal, `activeLots` shrinks (the withdrawn lot is filtered out by `sale.lots.filter(l => !l.withdrawn)`). Reset `lotIndex` to `Math.min(lotIndex, activeLots.length - 1)` — or simply `0` — to avoid an out-of-bounds index. A simple approach is to call `setLotIndex(0)` in the confirm handler before the state update propagates.

**Disabled state:** If `sale.day <= day` (sale day has arrived or passed), render the button disabled with tooltip text `"Cannot withdraw after sale day"`. This is belt-and-suspenders; the eligibility guard above already hides it for resolved sales, but `isSaleDay` shows the `AuctionTheater` instead of the lot navigator, so this state is only reachable in an edge case (e.g. the player navigates directly via URL).

### Store action signature (no change needed)

The existing action is:

```ts
withdrawConsignment: (horseId: string) => { ok: true } | { ok: false; reason: string };
```

It is already on `MarketSlice` and already handles the guard `if (sale.resolved) return { ok: false, reason: "Sale already resolved." }`. The route only needs to call it with `currentLot.horseId` and surface any error reason in the UI (e.g. `setMessage(result.reason)`).

---

## Edge Cases

**Player-consigned lot where the player is also watching the ring (B1)**

The theater iterates all lots, including those the player consigned. The runner already skips player bids on player-consigned lots because `consignorStableId === undefined` causes `isPlayerConsignment` to be true — the bid controls must be disabled rather than interactive to prevent the player from accidentally self-bidding.

**Sale with only player-consigned lots (B1 scoreboard)**

If all lots in the sale are player consignments, `scoreboard.won === 0` and `scoreboard.spent === 0`. The "Acquired" cell renders `"0 · $0"`. This is acceptable; no special case needed.

**Lot passed (B2 results)**

`lot.passed === true` means `lot.hammerPrice` is `undefined`. The results card must guard all price arithmetic with a null check. Show "Passed — reserve not met" for the hammer price, and omit commission/net rows entirely.

**Player also bid on other lots in the same sale (B2)**

The "Your Consignments" section only filters `!lot.consignorStableId`. Lots the player won as a _buyer_ (`lot.soldToStableId === undefined && lot.consignorStableId !== undefined`) appear only in the general lot navigator below, not in this section. The two roles are mutually exclusive per lot.

**Withdrawing the only lot in a sale (B3)**

If the player withdraws their only consignment and the sale has no other lots, `activeLots` becomes empty. The lot navigator renders the `"No lots in this sale."` card, which is correct existing behaviour.

**Navigating directly to a resolved sale with no player consignments (B2)**

`playerConsignedLots.length === 0` → the "Your Consignments" section is not rendered at all. No visible change.

**`withdrawConsignment` called on an already-withdrawn lot**

The existing store action checks `if (!horse.consignedSaleId) return { ok: false, reason: "Horse not consigned." }`. Because the lot navigator already filters `!lot.withdrawn`, the UI will not show the button for withdrawn lots. Belt-and-suspenders: the store returns a graceful error if somehow called twice.

**Post-sale withdrawal attempt (race condition)**

If the player submits the withdrawal dialog at the exact moment the day rolls over and the sale resolves, the store action's `if (sale.resolved) return { ok: false, reason: "Sale already resolved." }` guard catches it. Surface the reason via `setMessage`.

---

## Testing Notes

**B1 — Theater consignor state**

- Consign a horse to an upcoming yearling sale. Advance to sale day. Confirm the `AuctionTheater` renders the `YOUR CONSIGNMENT` badge on that lot.
- Verify the bid panel is replaced with the "You consigned this lot" message and no bid inputs appear.
- Press Space during the player-consigned lot. Confirm no bid is placed (chant advances normally from the auctioneer side).
- Confirm the scoreboard "Proceeds" cell updates after the lot hammers.
- Confirm `playerIsLeading` is always false for player-consigned lots (leading bidder is always an NPC stable ID or undefined-from-chant, never the player).

**B2 — Post-sale results**

- Resolve a sale with at least one player-consigned horse that sold and one that passed.
- Confirm the "Your Consignments" section appears above the lot navigator.
- For the sold lot: verify `commissionAmount` + `netProceeds` sum to `hammerPrice`.
- For the passed lot: verify no commission/net rows appear; "Passed — reserve not met" displays.
- Confirm the aggregate footer shows the correct sold count and total net proceeds.
- Navigate to a resolved sale that has no player consignments. Confirm the section does not render.

**B3 — Withdraw consignment**

- Consign a horse. Navigate to the sale detail before sale day. Confirm the "Withdraw Consignment" button appears on the player-consigned lot card.
- Click Withdraw, then "Keep consignment" on the dialog. Confirm nothing changes.
- Click Withdraw, then confirm. Verify `horse.consignedSaleId` is cleared, the lot is absent from `activeLots`, and the lot index resets gracefully.
- Verify the withdraw button does not appear on NPC-consigned lots.
- Verify the withdraw button is absent (or disabled) once `sale.day <= day`.
- Verify the withdraw button is absent on a resolved sale.
