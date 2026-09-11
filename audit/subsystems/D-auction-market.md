# Audit: Auction & Market (Subsystem D)

**Scope:** `src/core/auction/` (9 files), `src/core/market/` (10 files)

## Cross-cutting checks

| Pattern | Hits |
|---------|------|
| `as any` | 0 |
| `as unknown as` | 0 |
| `console.*` | 0 |
| TODO/FIXME | 0 |

Note: structural casts exist: `priceAlerts.ts:337` `(ask as { horseName?: string })`, `strategy.ts:82` `grade as (typeof GRADE_SEGMENTS)[number]`, `claimingImpacts.ts` 6x `as CashImpact` etc.

## Files requiring action

### FIX: `src/core/auction/engine.ts`
- `calculateNpcBid` `house` param is optional (`house?: AuctionHouse`) — AGENTS.md says required. AI branch (l.137-183) **ignores `house` entirely** — only non-AI fallback (l.187) applies prestige multiplier. **AI-managed bidders don't get prestige-adjusted ceilings.**
- Aggressive/prestige path (l.198-207): `Math.ceil(aggressiveBid / 100) * 100` not rechecked against `maxBid` — can exceed ceiling.
- `generateAuctionLots` mutates input `allHorses` array via `.push()` (l.384) — side effect on argument.
- Duplicate import/re-export of `calculateLotValuation` and `personalityConsignmentPolicy` in same file.

### FIX: `src/core/auction/auctionConsignment.ts`
- `specialist` strategy (l.87-91): `Object.entries(apts)` then `best[0]` — crashes if `surfaceAptitude` undefined/empty.
- `colts` filter (l.140): `isMaleHorse(h.gender) || h.gender === "gelding"` — redundant (isMaleHorse already covers gelding).
- Fallback (l.158-164): unreachable under current personality union — hides missing-personality cases.

### FIX: `src/core/auction/auctionResolution.ts`
- l.75: `currentWinner === undefined` condition makes it **unsafe for player hammer prices** — a lot the player bid on can be silently passed if no NPC outbids.
- l.77: Log always says "reserve not met" even when reason is "no bids".

### FIX: `src/core/auction/auctionRunnerImpacts.ts`
- l.172: `lot.consignorStableId === ""` vs l.23: `!lot.consignorStableId` — two different definitions of "player consignment" (undefined vs empty string).
- l.161-166: `horse_transfer` impact uses raw `consignorStableId`/`winnerStableId` — when player (undefined), impact has `fromStableId`/`toStableId: undefined` instead of `"player"` key.

### FIX: `src/core/auction/auctionValuation.ts`
- `specialistValuation` (l.65-69): never looks at the horse — only checks stable's preferred distance vs 1600. Should compare horse's `distanceAptitude`.
- `developerValuation` (l.45-55): double-discounts racing_age lots (applies `1.0 - AUCTION_RACING_AGE_DISCOUNT` twice).

### FIX: `src/core/market/exchangeAI.ts`
- `resolveNpcExchangeTrades` (l.367-374): recalculates `sellerStance(seller)` and uses `fairValue * stance.acceptFloor` — ignores `ask.acceptFloor` computed at listing time. Listing-time and settlement-time floors can diverge.

### FIX: `src/core/market/priceAlerts.ts`
- l.337: `(ask as { horseName?: string }).horseName ?? ask.horseId` — `ExchangeAsk` has no `horseName` field, so always falls back to `horseId` (ID, not name). **PR #388's `(ask as any).horseName` would be a worse regression.** Proper fix: pass a `Map<string, Horse>` and look up `horse.name`.

## calculateNpcBid call sites (AGENTS.md gotcha)

Production call sites (both pass `house`):
- `runner.ts:124-134` — passes `saleHouse` ✓
- `auctionResolution.ts:54-64` — passes `house` ✓

Test call sites (most omit `house`):
- `housePrestigeBidding.test.ts:55,67,91,103` — passes ✓
- `perfShape.test.ts:146` — passes ✓, `:168` — omits ✗
- `engine.characterization.test.ts:103,112,120,128,143` — all omit ✗
- `game/auction.test.ts:201,208,215,225,233,240` — all omit ✗

**Key issue:** Even when `house` is passed, the AI branch ignores it. Only the non-AI fallback applies the prestige multiplier.

## Files: KEEP
- `auctionRunnerTypes.ts`, `biddingHistory.ts`, `data.ts`, `runner.ts` (with notes), `claiming.ts`, `claimingImpacts.ts`, `exchange.ts`, `houseQuotes.ts`, `priceAlertMessages.ts`, `strategy.ts`, `tradeSeries.ts`, `types.ts`
