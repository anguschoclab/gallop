---
name: Auction New Mechanics
description: Buy-now pricing, private sales between player and NPCs, claiming races
type: feature
status: Approved
---

# Auction New Mechanics

## Overview

Three complementary mechanics extend the horse acquisition and trading surface:

| Mechanic | Where | Player action | NPC participation |
|---|---|---|---|
| **D1 — Buy-Now Pricing** | Auction lot detail | Skip the bidding war at a fixed price | Auctioneer sets price at sale generation |
| **D2 — Private Sales** | NPC stable detail | Make a direct offer for a specific horse | NPC accepts, counters, or declines |
| **D3 — Claiming Races** | Race browser + race detail | Enter a horse at risk; claim rivals' horses | All NPC stables may file claims |

All three mechanics share the same foundational constraints:

- **Insufficient cash is a hard block** — the action must fail with an explanatory message before reaching any confirmation dialog.
- **`AlertDialog`** is the confirmation component for all irreversible financial or ownership-change actions (see design-bible interaction patterns §Drawer-vs-dialog).
- **State visibility** (design principle 6) — the player must always be able to see the current status of a pending offer, a buy-now threshold, or a claiming entry, not infer it.
- **Primary verb per screen** (design principle 5) — "Buy Now", "Make an Offer", and "Claim" each own their screen zone; secondary actions step back visually.

---

## D1 — Buy-Now Pricing

### New types

Add `buyNowPrice` as an optional field on `AuctionLot` in `src/game/types.ts`:

```ts
type AuctionLot = {
  // ... existing fields ...
  buyNowPrice?: number; // set by auctioneer at generation; undefined once threshold crossed
};
```

No new top-level types are needed for D1.

### Logic

**At sale generation time** the auctioneer (NPC) sets `buyNowPrice` on each lot. The price is set on lot creation, never by the player.

**Eligible sale kinds**: `yearling`, `yearling_south`, `weanling`, `weanling_south`, `mixed`, `2yo_training`, `racing_age`. Buy-now is **not** available on `broodmare` sales — broodmares are always fully auctioned.

**Threshold rule**: once `currentBid >= buyNowPrice * 0.75`, the lot's `buyNowPrice` is cleared to `undefined` in runner state. This removal is permanent for that lot.

**Resolution on buy-now**: pressing "Buy Now" immediately resolves the lot. The store action emits a `SOLD` event and then calls `finalImpacts()` with `liveMode: true`.

### New store action

```ts
buyNow(saleId: string, lotId: string): { ok: boolean; reason?: string }
```

Guard conditions (return `{ ok: false, reason }` if any fail):

1. `buyNowPrice` is `undefined` on the lot — buy-now has been removed.
2. Player's current cash < `buyNowPrice` — insufficient funds.
3. The sale is already `resolved` — too late.
4. The player already owns this horse — degenerate state guard.

On success: apply `CashImpact` (deduct `buyNowPrice`, no commission) + `HorseTransferImpact` immediately, mark lot as sold.

### Affected files

| File | Change |
|---|---|
| `src/game/types.ts` | Add `buyNowPrice?: number` to `AuctionLot` |
| `src/game/store.ts` | Add `buyNow` action |
| `src/game/auctionSaleGenerator.ts` (or equivalent) | Set `buyNowPrice` at generation |
| `src/routes/auction.$saleId.tsx` | Buy-now button + AlertDialog |
| `src/components/AuctionTheater.tsx` | Buy-now button in live bidding view |

### UI components

**Lot detail (`auction.$saleId.tsx`) and `AuctionTheater.tsx`**

- "Buy Now $X" button, `variant="outline"`, placed immediately below the current bid display.
- Format: `"Buy Now $X,XXX"` using `Intl.NumberFormat` with `style: 'currency'`.
- Confirm with `AlertDialog`:
  - Title: `"Buy [Horse Name] now for $X,XXX?"`
  - Body: `"This immediately ends the lot. Your account will be debited $X,XXX and [Horse Name] will transfer to your stable."`
  - Actions: `[Cancel]` / `[Buy Now]`
- When `buyNowPrice` transitions to `undefined` during an active session (bid threshold crossed), the button is replaced with the single-line text `"Buy-now no longer available"` for 4 seconds, then removed. Use a Sonner toast as a secondary signal: `"Buy-now removed — bidding is active."`.
- The button must **not** render if `buyNowPrice` is already `undefined`.

**Lot card (auction list view)**

- When `buyNowPrice` is set, show a small secondary label below the current bid: `"Buy now: $X,XXX"` in `text-muted-foreground`.

---

## D2 — Private Sales

### New types

Add to `src/game/types.ts`:

```ts
type PrivateSaleStatus = 'pending' | 'accepted' | 'countered' | 'declined' | 'expired';

type PrivateSaleOffer = {
  id: string;
  horseId: string;
  fromStableId?: string;  // undefined = offer originates from player
  toStableId?: string;    // undefined = player is the recipient
  amount: number;
  counterAmount?: number; // populated only when status === 'countered'
  status: PrivateSaleStatus;
  createdDay: number;
  expiresDay: number;     // always createdDay + 3
};
```

Add to `GameState`:

```ts
privateSaleOffers: PrivateSaleOffer[];
```

### Logic

**Initiation**: the player proposes from the horse detail within `npc-stables.$stableId.tsx`. NPC → player offers are not scoped in this release (reserved for future); all `fromStableId: undefined` offers originate from the player.

**NPC evaluation** (runs synchronously inside `proposePrivateSale`, same tick as the player submitting):

```
valuation = calculateLotValuation(horse, npcStable, 'racing_age', allHorses)

if offer.amount >= valuation * 0.90  → status = 'accepted'
if offer.amount >= valuation * 0.60  → status = 'countered', counterAmount = valuation * 0.95
if offer.amount <  valuation * 0.60  → status = 'declined'
```

**Counter-round**: the player gets exactly one counter-round — they can accept or decline the `counterAmount`. No further negotiation rounds are permitted.

**Expiry**: if the offer status is still `'pending'` or `'countered'` on day `expiresDay`, the store's day-advance logic transitions it to `'expired'`. Expiry is processed before any other day-advance effects.

**Resolution on acceptance**: immediately apply:
1. `CashImpact` — deduct the final agreed amount from the player; credit the NPC stable (NPC cash is tracked for simulation fidelity but not player-visible).
2. `HorseTransferImpact` — transfer horse from NPC stable to player stable.

No commission is charged on private sales.

**On decline/expiry**: no cash or horse transfer. The offer record is retained for 7 days for UI display, then pruned.

### New store actions

```ts
proposePrivateSale(horseId: string, stableId: string, amount: number): { ok: boolean; reason?: string }
respondToPrivateSale(offerId: string, accept: boolean): { ok: boolean; reason?: string }
```

`proposePrivateSale` guard conditions:

1. Player cash < `amount` — insufficient funds.
2. An offer with `status: 'pending' | 'countered'` already exists for this horse from the player — duplicate guard.
3. Horse does not belong to `stableId` — stale state guard.

`respondToPrivateSale` guard conditions:

1. Offer not found or already in a terminal status (`'accepted' | 'declined' | 'expired'`) — reject silently.
2. `accept === true` and player cash < `offer.counterAmount` (when responding to a counter) — insufficient funds.

### Affected files

| File | Change |
|---|---|
| `src/game/types.ts` | Add `PrivateSaleStatus`, `PrivateSaleOffer`; extend `GameState` |
| `src/game/store.ts` | Add `proposePrivateSale`, `respondToPrivateSale`; add expiry logic to day-advance |
| `src/game/impacts.ts` (or equivalent) | Handle private sale `CashImpact` + `HorseTransferImpact` |
| `src/routes/npc-stables.$stableId.tsx` | "Make an Offer" button + offer dialog |
| `src/components/Sidebar.tsx` (or nav component) | Pending-offer badge on NPC Stables nav item |
| `src/hooks/useDayAdvance.ts` (or equivalent) | Expiry processing + offer-response toasts |

### UI components

**Horse card in `npc-stables.$stableId.tsx`**

- Add `"Make an Offer"` button (`variant="outline"`, `size="sm"`) on each horse card in the Roster tab.
- Button is disabled (with tooltip `"Offer pending"`) when an active offer already exists for this horse.

**Offer dialog**

Triggered by "Make an Offer". Use `Dialog` (not `AlertDialog` — it is not irreversible at this step):

- Title: `"Make an offer for [Horse Name]"`
- Price input: numeric, `inputMode="numeric"`, formatted on blur.
- Hint row (fog-of-war): `"Estimated market value: ~$X,XXX – $Y,YYY"` where the range is ±20% of `calculateLotValuation(...)`. Do not show the exact valuation; this preserves strategic uncertainty.
- `[Cancel]` / `[Submit Offer]`

**After submission — outcome display**

Outcomes are shown as Sonner toasts on the same tick (instant NPC evaluation):

| Status | Toast |
|---|---|
| `accepted` | `"[Stable] accepted your offer of $X for [Horse]. They join your stable."` |
| `countered` | `"[Stable] countered at $X,XXX. Go to Rival Stables to respond."` |
| `declined` | `"[Stable] declined your offer. [Flavour line based on stable personality]."` |

Flavour copy for declines (keyed to `Stable.personality`):
- `"aggressive"`: `"Not for sale at that price. Try harder."`
- `"prestige"`: `"This horse is not for sale to just anyone."`
- `"conservative"`: `"We don't sell below market."`
- `"breeder"`: `"We intend to breed from this horse."`
- Default: `"[Stable name] declined your offer."`

**Counter offer display** (in `npc-stables.$stableId.tsx` horse card, or offer detail panel):

When a counter is active, show an inline card under the horse:

```
┌─────────────────────────────────────────────────────┐
│ Counter offer from [Stable]: $X,XXX                 │
│ Expires day [N]                                     │
│ [Decline]    [Accept $X,XXX]                        │
└─────────────────────────────────────────────────────┘
```

"Accept $X,XXX" opens an `AlertDialog`:
- Title: `"Accept counter offer?"`
- Body: `"You will pay $X,XXX for [Horse Name]. This cannot be undone."`
- Actions: `[Cancel]` / `[Accept]`

**Sidebar badge**

The NPC Stables sidebar nav item gains a `Badge` (variant `info`, `size="sm"`) showing the count of offers requiring player action (status `countered`). The badge disappears when no counters are pending.

---

## D3 — Claiming Races

### New types

Extend `Race` in `src/game/types.ts`:

```ts
type Race = {
  // ... existing fields ...
  claiming?: { price: number };
};
```

Add a new type:

```ts
type Claim = {
  id: string;
  raceId: string;
  horseId: string;
  claimantStableId?: string; // undefined = player is the claimant
  price: number;
  day: number;
};
```

Add `ClaimResolutionImpact` to the `AnyImpact` union:

```ts
type ClaimResolutionImpact = {
  kind: 'claimResolution';
  raceId: string;
  horseId: string;
  winningClaimId: string;
  losingClaimIds: string[];
};
```

Add to `GameState`:

```ts
claims: Claim[];
```

### Logic

**Eligibility**: only races with `claiming` set (i.e., `race.claiming !== undefined`) can have claims filed against their horses.

**Opt-in entry**: the player must explicitly choose to enter a claiming race. This is separate from a normal entry — a dedicated "Enter at Claiming Price" button triggers a confirmation dialog that explains the risk. There is no implicit enrollment.

**Withdrawal window**: claiming races are the only race type that allows withdrawal. The player can withdraw until the day before race day (i.e., `race.day - 1`). After entries close the horse is locked in.

**Filing a claim**: any stable (including the player) may file a `Claim` against any horse entered in a claiming race, at any time before post (before `race.day`). The claim is at the fixed `race.claiming.price` — no negotiation.

**Self-claim prohibition**: the player cannot file a claim on their own horse; the store action enforces this.

**NPC claiming behaviour**: NPC stables evaluate whether to file a claim using `calculateLotValuation`. An NPC stable files a claim when `race.claiming.price <= calculateLotValuation(horse, npcStable, 'racing_age', allHorses) * 0.85`. NPC claims are filed as part of the day-advance / race setup step, before the race runs.

**Multi-claim resolution**: if more than one claim is filed for the same horse, a single winning claim is selected randomly (uniform distribution). Losing claimants receive nothing and pay nothing.

**Resolution** (executed in the race resolver, after the race completes):

For each horse that has one or more claims:

1. Pick winner randomly from that horse's claims.
2. Apply `CashImpact`: deduct `claim.price` from claimant; credit `netProceeds(claim.price)` to the original owner (6% commission applied identically to auction proceeds).
3. Apply `HorseTransferImpact`: transfer horse to claimant's stable.
4. Emit `ClaimResolutionImpact` with winning and losing claim IDs.

Prize money from the race is still paid to the horse's original owner for that running, before the claim transfers ownership.

### New store actions

```ts
enterClaimingRace(raceId: string, horseId: string): { ok: boolean; reason?: string }
withdrawFromClaimingRace(raceId: string, horseId: string): void
fileClaim(raceId: string, horseId: string): { ok: boolean; reason?: string }
```

`enterClaimingRace` guard conditions:

1. `race.claiming` is undefined — not a claiming race.
2. Horse does not belong to the player.
3. Current day >= `race.day` — entries closed.

`withdrawFromClaimingRace` guard conditions:

1. Horse is not entered in this race.
2. Current day >= `race.day - 1` — withdrawal window closed. Return silently (the action is disabled in UI by this point, but guard for safety).

`fileClaim` guard conditions:

1. `race.claiming` is undefined.
2. Horse belongs to the player — self-claim prohibited.
3. Player cash < `race.claiming.price` — insufficient funds.
4. A claim by the player already exists for this horse in this race — duplicate guard.
5. Current day >= `race.day` — post time passed.

### Affected files

| File | Change |
|---|---|
| `src/game/types.ts` | Extend `Race` with `claiming`; add `Claim`, `ClaimResolutionImpact`; extend `GameState` |
| `src/game/store.ts` | Add `enterClaimingRace`, `withdrawFromClaimingRace`, `fileClaim` |
| `src/game/raceResolver.ts` (or equivalent) | Multi-claim resolution logic in post-race pass |
| `src/game/impacts.ts` | Handle `ClaimResolutionImpact` |
| `src/routes/races.tsx` | Claiming badge on race list rows |
| `src/routes/race.$raceId.tsx` | Entry button variant, withdraw button, claim button, post-race recap |

### UI components

**Race list (`races.tsx`)**

Claiming races display a badge on the row:

```
⚠ Claiming $X,XXX
```

Badge variant: `warning` (amber token). This signals risk to the player — it is not informational. Placed immediately after the purse figure or class badge.

**Race detail (`race.$raceId.tsx`) — entry zone**

When the race has `claiming` set, the standard "Enter [horse]" button is **replaced** with:

```
[Enter at Claiming Price $X,XXX]
```

Button variant: `outline` with a `warning` icon prefix.

This triggers an `AlertDialog`:

- Title: `"Enter [Horse] in a claiming race?"`
- Body: `"Entering [Horse] in this race at $X,XXX claiming price means any stable can purchase them after the race runs. The transfer happens automatically at the claiming price, net of 6% commission. You may withdraw up to 1 day before the race."`
- Actions: `[Cancel]` / `[Enter — I understand the risk]`

The CTA is intentionally verbose: it must state consequences (design bible confirmation copy standard).

**Race detail — withdraw button**

After entering, a `"Withdraw [Horse]"` button (`variant="ghost"`, `size="sm"`) appears on the entry confirmation card. It is:

- Active when `currentDay < race.day - 1`.
- Replaced with `"Withdrawal closed"` (disabled, `text-muted-foreground`) when the window passes.

Withdrawal does not require a confirmation dialog (it is a reversal, not a destructive forward action). A Sonner toast confirms: `"[Horse] withdrawn from [Race Name]."`.

**Race detail — claim filing (pre-race)**

For each horse in the entry list that the player does not own:

```
[Claim for $X,XXX]
```

Button `variant="outline"`, `size="sm"`, placed in the horse's entry row. Triggers `AlertDialog`:

- Title: `"Claim [Horse] for $X,XXX?"`
- Body: `"If your claim is drawn, $X,XXX will be deducted from your account and [Horse] will transfer to your stable after the race completes. Multiple claims on the same horse are resolved randomly."`
- Actions: `[Cancel]` / `[File Claim]`

Once the player has filed a claim, the button is replaced with `"Claim filed"` (disabled, `variant="ghost"`).

**Post-race recap**

In the race result view (`race.$raceId.tsx` post-race state), claim outcomes appear as a dedicated section below finishing order:

```
Claiming transfers
─────────────────
Stardust → Alkmene Bloodstock   $18,000   (your horse was claimed)
Knight Errant → Your stable     $12,500   (claim successful)
Copper King — no claim filed
```

Lines are colour-coded:
- `"your horse was claimed"` — `destructive` text token.
- `"claim successful"` — `success` text token.
- `"no claim filed"` — `text-muted-foreground`.

Toasts are also shown for each player-affecting outcome on day advance:
- `"[Horse] was claimed by [Stable] for $X,XXX after [Race Name]."`
- `"Your claim on [Horse] was successful. They join your stable for $X,XXX."`
- `"Your claim on [Horse] was not drawn. No charge."`

**Claiming status on race list (post-entry)**

Once the player has entered a horse in a claiming race, the race row in `races.tsx` shows a secondary status badge alongside the claiming badge:

```
[Your stable]  ⚠ Claiming $X,XXX  [Entered — at risk]
```

`"Entered — at risk"` badge variant: `warning`, so the risk is never visually buried.

---

## Resolution Logic

### D1 — Buy-now resolution sequence

1. Player presses "Buy Now".
2. Store validates guards (see above). On failure, return `{ ok: false, reason }` — show inline error, no dialog.
3. Player confirms `AlertDialog`.
4. `buyNow` action fires:
   a. Set `lot.hammerPrice = lot.buyNowPrice`.
   b. Set `lot.soldToStableId = playerStableId`.
   c. Set `lot.passed = false`.
   d. Clear `lot.buyNowPrice = undefined`.
   e. Apply `CashImpact` + `HorseTransferImpact` via `finalImpacts({ liveMode: true })`.
   f. Mark lot as resolved.
5. Toast: `"[Horse Name] joins your stable."`.

### D2 — Private sale resolution sequence

**Accepted on first offer**:
1. `proposePrivateSale` evaluates → `status: 'accepted'`.
2. Apply `CashImpact` + `HorseTransferImpact` immediately.
3. Toast confirms acquisition.

**Counter-round**:
1. `proposePrivateSale` evaluates → `status: 'countered'`, `counterAmount` set.
2. Toast: `"[Stable] countered at $X,XXX."`.
3. Player navigates to NPC stable detail, sees inline counter card.
4. Player calls `respondToPrivateSale(offerId, true/false)`.
5. If `accept: true`: validate cash ≥ `counterAmount`, apply impacts, toast success.
6. If `accept: false`: set `status: 'declined'`, toast `"Counter declined."`.

**Declined on first offer**:
1. `proposePrivateSale` evaluates → `status: 'declined'`.
2. Toast with flavour copy. Offer record retained for UI but no further actions available.

**Expiry**:
1. Day-advance loop checks all offers where `status === 'pending' | 'countered'` and `currentDay >= expiresDay`.
2. Transition to `status: 'expired'`.
3. Toast: `"Your offer on [Horse] expired."`.

### D3 — Claiming race resolution sequence

Runs inside the race resolver, after finishing order is computed:

1. Collect all `Claim` records where `claim.raceId === race.id`.
2. Group by `claim.horseId`.
3. For each horse group with ≥ 1 claim:
   a. If multiple claims: shuffle deterministically (seeded by `raceId + horseId`) and take first.
   b. Winning claimant: apply `CashImpact(debit = claim.price)` to claimant; apply `CashImpact(credit = netProceeds(claim.price))` to original owner.
   c. Apply `HorseTransferImpact`.
   d. Emit `ClaimResolutionImpact`.
4. Losing claims: no financial effect.
5. Post-race recap populated from `ClaimResolutionImpact` records.

---

## Edge Cases

### Insufficient cash

**D1 — buy-now**: `buyNow` returns `{ ok: false, reason: 'insufficient_funds' }` before the dialog opens. Show an inline error below the "Buy Now" button: `"Insufficient funds. You need $X,XXX more."`. Do not open the `AlertDialog`.

**D2 — private sale proposal**: `proposePrivateSale` returns `{ ok: false, reason: 'insufficient_funds' }`. The offer dialog shows a validation error on the price input field and blocks submission. The player can change the amount.

**D2 — accepting a counter**: `respondToPrivateSale` returns `{ ok: false, reason: 'insufficient_funds' }`. The "Accept $X,XXX" button in the counter card is disabled with tooltip `"Insufficient funds"`. The player cannot accept until funds are available (they may have spent cash between receiving the counter and responding).

**D3 — claiming**: `fileClaim` returns `{ ok: false, reason: 'insufficient_funds' }`. The "Claim for $X,XXX" button shows an inline tooltip: `"You need $X,XXX to file this claim."`. The button remains visible but disabled.

### Expired private sale offers

- Expired offers are pruned from `GameState.privateSaleOffers` after 7 game days.
- If the player navigates to a stable where an offer just expired, the counter card is gone and the "Make an Offer" button is re-enabled.
- Toast on the day the expiry triggers: `"Your offer on [Horse] from [Stable] expired without a response."`.

### Race day withdrawal cutoff

- The withdrawal window closes at the start of day `race.day - 1` (i.e., when `currentDay === race.day - 1`, withdrawal is already closed).
- The `withdrawFromClaimingRace` store action enforces this with a guard and returns silently.
- In the UI, the "Withdraw" button transitions to disabled state with label `"Withdrawal closed"` at the same moment. Use a derived selector `canWithdraw = currentDay < race.day - 1`.
- If the player advances from a day where withdrawal was possible to a day where it is not, and the "Entered — at risk" badge is on screen, a one-time toast fires: `"Withdrawal window closed for [Race Name]. [Horse] is entered."`.

### Multiple claims on the same horse

- There is no limit to the number of claims on a single horse.
- The player sees the "Claim filed" state on their own claim row; the existence of NPC claims is not surfaced pre-race (fog of war — the player cannot see how many competitors have filed).
- Post-race, the recap always shows the winning claimant. Losing claims on the same horse are not listed (too noisy), but a note appears: `"[N] stables filed claims. Yours was not drawn."` if the player's claim lost.
- If the player wins a claim on a horse they already tried to buy via private sale (both were active), the claim resolution takes precedence; any pending private sale offer for that horse is automatically voided on `HorseTransferImpact`.

### Buy-now threshold race condition (concurrent NPC bid)

- Threshold evaluation (`currentBid >= buyNowPrice * 0.75`) is checked at the start of each bid processing step (NPC or player).
- If an NPC bid crosses the threshold in the same resolution cycle as the player pressing "Buy Now", the `buyNow` action guard will find `buyNowPrice === undefined` and return `{ ok: false, reason: 'buy_now_unavailable' }`. The confirmation dialog will not have opened yet (the guard runs before the dialog), so no orphaned dialog state exists.

### Private sale for a horse also in an upcoming auction

- A horse cannot have a pending private sale offer and also be listed in an active `AuctionLot` simultaneously. `proposePrivateSale` checks for an active lot for the horse and returns `{ ok: false, reason: 'horse_in_auction' }`. The "Make an Offer" button is disabled with tooltip `"This horse is currently in a sale."` for the duration of the sale.

---

## Testing Notes

### D1 — Buy-Now Pricing

- Unit test `buyNow` action: success path (lot resolved, cash deducted, horse transferred).
- Unit test buy-now threshold: confirm `buyNowPrice` becomes `undefined` once bid crosses 75% of it.
- Unit test guard: `buyNow` on a `broodmare` sale kind should either be a no-op (buy-now was never set) or return `'buy_now_unavailable'`.
- Unit test guard: insufficient funds.
- Unit test guard: sale already resolved.
- UI test: "Buy Now" button renders when `buyNowPrice` is set, disappears when it becomes `undefined`.
- UI test: confirmation dialog shows correct horse name and price.

### D2 — Private Sales

- Unit test `proposePrivateSale`: all three evaluation branches (accept / counter / decline) with boundary values at 90% and 60% of valuation.
- Unit test `respondToPrivateSale` accept: horse transferred, cash deducted, status transitions.
- Unit test `respondToPrivateSale` decline: no transfer, status transitions.
- Unit test expiry logic in day-advance: offers expire on correct day.
- Unit test duplicate offer guard.
- Unit test `horse_in_auction` guard.
- UI test: offer dialog validation — price input blocked on submit when cash < amount.
- UI test: sidebar badge count increments when counter received, decrements when resolved.
- UI test: fog-of-war range hint renders within ±20% of true valuation.
- Integration test: full round-trip — propose → counter → accept → horse in stable, cash deducted.

### D3 — Claiming Races

- Unit test `enterClaimingRace`: success, non-claiming race guard, entries-closed guard.
- Unit test `withdrawFromClaimingRace`: success within window, guard after window closes.
- Unit test `fileClaim`: success, self-claim guard, insufficient funds, duplicate claim guard, post-time guard.
- Unit test NPC claiming evaluation: NPC claims when `price <= valuation * 0.85`, does not claim otherwise.
- Unit test multi-claim resolution: given N claims on one horse, exactly one winner is selected; others receive no financial effect.
- Unit test claim cash flow: winning claimant pays `claim.price`; original owner receives `netProceeds(claim.price)`.
- Unit test: prize money credited to original owner even when horse is claimed.
- Unit test: pending private sale offer on claimed horse is voided on `HorseTransferImpact`.
- UI test: `"⚠ Claiming $X"` badge renders on claiming races in race list; absent on non-claiming races.
- UI test: entry button replaced by "Enter at Claiming Price" for claiming races.
- UI test: withdraw button disabled after `race.day - 1` cutoff.
- UI test: "Claim filed" state replaces "Claim for $X" button after claim is filed.
- UI test: post-race recap section renders claim transfers with correct tokens (destructive / success).
- Integration test: full round-trip — enter horse → NPC files claim → race resolves → horse transferred, cash flows correct.
