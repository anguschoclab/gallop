---
name: Auction and market
description: Buying horses (auction) and trading shares/upgrades (market)
type: screen
status: Stable
owns: engineering:documentation
---

# Auction and market

## At a glance

| | Auction | Auction detail | Market |
|---|---|---|---|
| **Route** | `/auction` ([auction.tsx](../../../src/routes/auction.tsx)) | `/auction/$saleId` ([auction.$saleId.tsx](../../../src/routes/auction.$saleId.tsx)) | `/market` ([market.tsx](../../../src/routes/market.tsx)) |
| **Persona** | All three | Maya, Tomás | Maya |
| **Primary verb** | Browse / Bid | Bid / Inspect | Trade / Upgrade |
| **Layout** | AppShell | AppShell | AppShell |

## Purpose

**Auction** — the daily refresh of buyable horses. Mix of yearlings, juveniles, and broodmares. Browse, scrutinise, bid.

**Auction detail** — single lot scrutiny. Pedigree, dosage, vet notes (future), bidding interface.

**Market** — non-horse acquisitions: stable upgrades, training tools, jockey contracts (future).

## User journey

### Auction (browse → bid)

1. Lands on `/auction`. Sees daily lots.
2. Filters by sex, age band, price band.
3. Opens a lot → `/auction/$saleId`.
4. Reviews pedigree, dosage, current bid.
5. Places bid (or buy-now if available).
6. On winning: horse appears in stable; cash deducted; toast confirms.

### Market

1. Lands on `/market`.
2. Sees categories: Stable upgrades, Training, Staff, Misc.
3. Picks a category → list of available items.
4. Buys → effect applies immediately.

## Layout

### Auction

```
┌─ Header: "Sales" ─ "12 lots today" ────────── [My bids] ─┐
├──────────────────────────────────────────────────────────┤
│ Filters: [Sex] [Age] [Price] [Reset]                     │
├──────────────────────────────────────────────────────────┤
│ ┌─Lot card─┐ ┌─Lot card─┐ ┌─Lot card─┐                   │
│ │ silk +   │ │          │ │          │                   │
│ │ name     │ │          │ │          │                   │
│ │ pedigree │ │          │ │          │                   │
│ │ current  │ │          │ │          │                   │
│ │ bid      │ │          │ │          │                   │
│ └──────────┘ └──────────┘ └──────────┘                   │
└──────────────────────────────────────────────────────────┘
```

### Auction detail

```
┌─ Lot N: silk + name ─────────────── [Bid $X] ─┐
├───────────────────────────────────────────────┤
│ ┌─Lineage─────┐ ┌─Dosage chart────┐           │
│ └─────────────┘ └─────────────────┘           │
│ ┌─Stats projection (uncertain)────────────┐   │
│ └─────────────────────────────────────────┘   │
│ Current bid: $X (n bids)                       │
│ Closes: in 2h 14m                              │
└───────────────────────────────────────────────┘
```

## Components used

- Primitives: `Card`, `Button`, `Input`, `Badge`, `Tabs`, `AlertDialog` (bid confirm).
- Domain: `HorseCard` (compact), `Lineage`, `BeyerBadge`.

## Data

- `useGame((s) => s.auction)` for lots.
- Daily refresh tied to `s.day` advance.
- NPC bidders simulated in [src/services/](../../../src/services/) (auction service, future).

## Copy

- Title: *"Sales"* (auction). *"Market"* (market).
- Bid CTA: *"Bid $X"* (the number is the proposed bid).
- Bid confirm: *"Place bid of $4,500 on Lot 12?"* / `[Cancel]` `[Place bid]`.
- Won lot: toast *"Lot 12 won. Stardust joins your stable."*.
- Outbid: toast *"Outbid on Lot 12. Current bid $4,750."*.
- Empty: *"Sale complete. Next refresh tomorrow."*

## States

- Default lot grid.
- Filtered empty → reset.
- Bidding closed (next refresh).
- Outbid (banner on watched lots).
- Won (lot moves to stable, removed from sale).

## Accessibility

- Bid amounts: numeric input with `inputMode="numeric"`, formatting on blur.
- Live region announces outbid events (*"You've been outbid on Lot 12"*).

## Open questions

- Buy-now vs. timed auction — both are useful. Currently the model is unclear; revisit when bidding system is finalised.
- Is *market* the right home for jockey contracts? Or a separate `/staff` screen?
