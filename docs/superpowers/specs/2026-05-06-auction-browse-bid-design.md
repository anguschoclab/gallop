---
name: Auction Browse & Bid Improvements
description: Filter, search, sort on pre-sale lot preview screen
type: feature
status: Approved
---

# Auction Browse & Bid Improvements

## Overview

The pre-sale lot preview screen (`/auction/$saleId`) currently shows one lot at a time with bare prev/next navigation. When a sale has 20+ lots, players must page through every horse linearly to find ones that match their budget or breeding criteria. This feature adds a filter bar, a search input, a sort control, and a result-count line above the existing lot navigator, so the navigator operates on the filtered subset rather than the full lot list.

The change is additive: the three-mode split (`AuctionTheater` on sale day, lot navigator before sale day, summary after resolution) is preserved. The controls described here are only visible in the pre-sale preview mode (not resolved, not sale day).

---

## Affected files

| File                             | Change                                                                                                                                 |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/auction.$saleId.tsx` | Primary implementation. Add `validateSearch`, derive filtered/sorted lot list, render filter bar and result count above the navigator. |
| `src/game/types.ts`              | No change needed — `AuctionLot`, `Horse`, `AuctionSale` are sufficient as-is.                                                          |

No new route files are required. All new UI is inline in the existing route component. If the filter bar grows beyond ~60 lines it should be extracted to `src/components/auction/AuctionBrowseFilters.tsx`, but the initial pass may stay inline.

---

## Search param schema

Add `validateSearch` to the route definition. All fields are optional; absent means "show all / default".

```ts
import { z } from "zod";

const auctionBrowseSearchSchema = z.object({
  sex: z.enum(["colt", "filly", "gelding", "mare"]).optional(),
  ageBand: z.enum(["weanling", "yearling", "2yo", "3yo+"]).optional(),
  reserveBand: z.enum(["under10k", "10k-50k", "over50k"]).optional(),
  sort: z.enum(["lot", "reserve-asc", "reserve-desc"]).optional(),
  q: z.string().optional(),
});

export type AuctionBrowseSearch = z.infer<typeof auctionBrowseSearchSchema>;
```

Wire it into the route:

```ts
export const Route = createFileRoute("/auction/$saleId")({
  validateSearch: auctionBrowseSearchSchema,
  component: AuctionSalePage,
});
```

Read params inside the component via:

```ts
const { sex, ageBand, reserveBand, sort, q } = Route.useSearch();
const navigate = useNavigate({ from: "/auction/$saleId" });
```

Write a filter value by calling `navigate({ search: (prev) => ({ ...prev, sex: "colt" }) })`. Clearing a filter sets the key to `undefined` (TanStack Router omits `undefined` keys from the URL).

---

## Age band mapping

Age bands map to `horse.age` (integer years):

| Band key   | `horse.age` values |
| ---------- | ------------------ |
| `weanling` | 0                  |
| `yearling` | 1                  |
| `2yo`      | 2                  |
| `3yo+`     | 3 or greater       |

---

## Reserve band mapping

Reserve bands map to `lot.reservePrice`:

| Band key   | Predicate                                          |
| ---------- | -------------------------------------------------- |
| `under10k` | `reservePrice < 10_000`                            |
| `10k-50k`  | `reservePrice >= 10_000 && reservePrice <= 50_000` |
| `over50k`  | `reservePrice > 50_000`                            |

---

## Derived lot list

All filtering and sorting happens in a single `useMemo` that produces `filteredLots`. This replaces the existing `activeLots` reference inside the pre-sale branch. The existing `activeLots` const (used for the sale summary in the resolved branch) is kept as-is.

```ts
const filteredLots = useMemo(() => {
  let result = activeLots; // activeLots = sale.lots.filter((l) => !l.withdrawn)

  // Sex filter
  if (sex) {
    result = result.filter((l) => {
      const h = horses.find((h) => h.id === l.horseId);
      return h?.gender === sex;
    });
  }

  // Age band filter
  if (ageBand) {
    result = result.filter((l) => {
      const h = horses.find((h) => h.id === l.horseId);
      if (!h) return false;
      if (ageBand === "weanling") return h.age === 0;
      if (ageBand === "yearling") return h.age === 1;
      if (ageBand === "2yo") return h.age === 2;
      if (ageBand === "3yo+") return h.age >= 3;
      return true;
    });
  }

  // Reserve band filter
  if (reserveBand) {
    result = result.filter((l) => {
      if (reserveBand === "under10k") return l.reservePrice < 10_000;
      if (reserveBand === "10k-50k") return l.reservePrice >= 10_000 && l.reservePrice <= 50_000;
      if (reserveBand === "over50k") return l.reservePrice > 50_000;
      return true;
    });
  }

  // Search filter — case-insensitive substring on name and sire
  if (q && q.trim().length > 0) {
    const needle = q.trim().toLowerCase();
    result = result.filter((l) => {
      const h = horses.find((h) => h.id === l.horseId);
      if (!h) return false;
      return (
        h.name.toLowerCase().includes(needle) || (h.sireName ?? "").toLowerCase().includes(needle)
      );
    });
  }

  // Sort
  if (sort === "reserve-asc") {
    result = [...result].sort((a, b) => a.reservePrice - b.reservePrice);
  } else if (sort === "reserve-desc") {
    result = [...result].sort((a, b) => b.reservePrice - a.reservePrice);
  }
  // sort === "lot" (or undefined) preserves the original lot-number order

  return result;
}, [activeLots, horses, sex, ageBand, reserveBand, sort, q]);
```

Everywhere the pre-sale branch previously referenced `activeLots`, replace with `filteredLots`. The lot count label, prev/next bounds, and `currentLot` index all operate on `filteredLots`.

---

## Component changes

### C1 — Filter bar

Render above the lot navigator, inside the pre-sale branch (`!isSaleDay && !isResolved`).

**Layout:**

```
┌─ Filter bar ──────────────────────────────────────────────────────────┐
│ [All|Colt|Filly|Gelding|Mare]  [All|Weanling|Yearling|2yo|3yo+]       │
│ [All|Under $10k|$10k–$50k|Over $50k]              [Reset]  [Sort ▾]  │
└───────────────────────────────────────────────────────────────────────┘
```

The search input (C2) sits above the filter bar.

**Sex filter — `ToggleGroup` (`variant="outline"`):**

```tsx
<ToggleGroup
  type="single"
  value={sex ?? ""}
  onValueChange={(v) => navigate({ search: (prev) => ({ ...prev, sex: v || undefined }) })}
>
  <ToggleGroupItem value="">All</ToggleGroupItem>
  <ToggleGroupItem value="colt">Colt</ToggleGroupItem>
  <ToggleGroupItem value="filly">Filly</ToggleGroupItem>
  <ToggleGroupItem value="gelding">Gelding</ToggleGroupItem>
  <ToggleGroupItem value="mare">Mare</ToggleGroupItem>
</ToggleGroup>
```

When `value=""` is selected the filter clears (sets to `undefined` in URL).

**Age band filter — `ToggleGroup` (`variant="outline"`):**

Same pattern, values `""` / `"weanling"` / `"yearling"` / `"2yo"` / `"3yo+"`.

**Reserve band filter — `ToggleGroup` (`variant="outline"`):**

Same pattern, values `""` / `"under10k"` / `"10k-50k"` / `"over50k"`. Display labels are "All" / "Under $10k" / "$10k–$50k" / "Over $50k".

**Reset button:**

```tsx
{
  hasActiveFilters && (
    <Button
      variant="ghost"
      size="sm"
      onClick={() =>
        navigate({
          search: () => ({}),
        })
      }
    >
      Reset
    </Button>
  );
}
```

`hasActiveFilters` is `true` when any of `sex`, `ageBand`, `reserveBand`, or `q` is defined (non-undefined). The `sort` param is not considered a filter for this purpose — the reset button does not clear the sort selection.

**Sort control (C3):**

Right-aligned in the filter bar, using the `Select` primitive:

```tsx
<Select
  value={sort ?? "lot"}
  onValueChange={(v) =>
    navigate({
      search: (prev) => ({
        ...prev,
        sort: v === "lot" ? undefined : (v as AuctionBrowseSearch["sort"]),
      }),
    })
  }
>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="Sort: Lot order" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="lot">Lot order</SelectItem>
    <SelectItem value="reserve-asc">Lowest reserve first</SelectItem>
    <SelectItem value="reserve-desc">Highest reserve first</SelectItem>
  </SelectContent>
</Select>
```

The sort control is always visible (not conditional on filters being active).

---

### C2 — Search input

Render above the filter bar, full width within the content column.

```tsx
const [searchDraft, setSearchDraft] = useState(q ?? "");

// Sync draft back to URL after 200 ms of inactivity
useEffect(() => {
  const id = setTimeout(() => {
    navigate({
      search: (prev) => ({ ...prev, q: searchDraft.trim() || undefined }),
    });
  }, 200);
  return () => clearTimeout(id);
}, [searchDraft]);

// Keep draft in sync if URL param changes externally (e.g. back/forward)
useEffect(() => {
  setSearchDraft(q ?? "");
}, [q]);
```

```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream-muted pointer-events-none" />
  <Input
    className="pl-9"
    placeholder="Search by name or sire…"
    value={searchDraft}
    onChange={(e) => setSearchDraft(e.target.value)}
  />
</div>
```

The `Search` icon is from `lucide-react` (already imported in the route file). The debounce prevents a URL write on every keystroke.

---

### C4 — Result count

Render between the filter bar and the lot navigator, visible only when `filteredLots.length < activeLots.length`:

```tsx
{
  filteredLots.length < activeLots.length && (
    <p className="text-sm text-cream-muted tabular-nums">
      Showing {filteredLots.length} of {activeLots.length} lots
    </p>
  );
}
```

When no filter is active the line is hidden entirely — it does not show "Showing 12 of 12 lots".

---

### C5 — Lot navigator adapts to filtered set

The existing `lotIndex` state drives navigation. Two changes are required:

**1. Reset lot index to 0 when filters change.**

```ts
const filterKey = `${sex ?? ""}|${ageBand ?? ""}|${reserveBand ?? ""}|${sort ?? ""}|${q ?? ""}`;

useEffect(() => {
  setLotIndex(0);
  setMessage("");
}, [filterKey]);
```

**2. Navigate within `filteredLots`, not `activeLots`.**

Replace all references to `activeLots` inside the pre-sale navigator branch:

```tsx
// Before
<span className="text-sm font-medium tabular-nums">
  Lot {lotIndex + 1} of {activeLots.length}
</span>

// After
<span className="text-sm font-medium tabular-nums">
  Lot {lotIndex + 1} of {filteredLots.length}
</span>
```

```tsx
// Before
disabled={lotIndex === activeLots.length - 1}

// After
disabled={lotIndex === filteredLots.length - 1}
```

```tsx
// Before
const currentLot: AuctionLot | undefined = activeLots[lotIndex];

// After
const currentLot: AuctionLot | undefined = filteredLots[lotIndex];
```

The next/prev click handlers clamp correctly once `filteredLots.length` is used as the upper bound.

**Empty filtered set — empty state card:**

When `filteredLots.length === 0`, the lot card area is replaced by:

```tsx
{
  filteredLots.length === 0 && (
    <Card>
      <CardContent className="p-8 text-center space-y-3">
        <p className="text-cream-muted">No lots match your filters.</p>
        <Button variant="ghost" size="sm" onClick={() => navigate({ search: () => ({}) })}>
          Reset filters
        </Button>
      </CardContent>
    </Card>
  );
}
```

The lot navigator (prev/next row) is also hidden when `filteredLots.length === 0`. The result-count line (`filteredLots.length < activeLots.length`) is still shown.

---

## Full pre-sale branch layout

After all changes, the pre-sale branch renders in this order:

1. Search input (C2)
2. Filter bar — sex, age band, reserve band, reset, sort (C1 + C3)
3. Result count — "Showing N of M lots" (C4), hidden when unfiltered
4. Lot navigator row — "Lot X of Y" + prev/next (C5), hidden when empty filtered set
5. Lot card — current horse card, OR empty-state card when filtered set is empty (C5)
6. Sale summary card — shown only when `isResolved` (unchanged)

---

## Edge cases

### Empty filter result

When all filters together produce zero matching lots:

- The lot navigator row is hidden.
- The lot card is replaced by the empty-state card with "No lots match your filters." and a "Reset filters" button.
- The result-count line still shows "Showing 0 of N lots".
- `lotIndex` stays at 0 (the reset effect already ran).

### Lot index reset on filter change

Any change to `sex`, `ageBand`, `reserveBand`, `sort`, or `q` triggers the `filterKey` effect, which sets `lotIndex` to 0 and clears `message`. This prevents a stale index pointing past the end of a shorter filtered list.

The effect fires on mount too (initial value of `filterKey`), but since `lotIndex` starts at 0 this is a no-op.

### Filter persists across page navigation

All filter state lives in URL search params. Navigating back to this route (e.g. via the browser back button) restores all filters. The `lotIndex` is local state and resets to 0 on re-mount — it is intentionally not persisted to the URL to avoid stale "Lot 7 of 4" situations.

### Withdrawn lots

`activeLots` is still filtered with `!l.withdrawn` before `filteredLots` is derived. Withdrawn lots are excluded before any filter or sort logic runs.

### Horse data unavailable

If `horses.find((h) => h.id === l.horseId)` returns `undefined` for a lot:

- Sex and age band filters: lot is excluded from the filtered set (conservative — don't show a lot we can't describe).
- Search filter: lot is excluded.
- Reserve band filter: lot passes (reserve price is on the lot, not the horse).
- The "Horse data unavailable" card already handles `currentLot && !horse` — no new handling needed.

### `AuctionSaleKind` and age bands

The sale kind (e.g. `yearling`, `weanling`) is purely a label. Age band filtering always reads `horse.age` directly. A mixed sale with a 3-year-old can still be filtered to "3yo+".

### Sort and lot ordering

"Lot order" (`sort === undefined`) preserves the original index order of `sale.lots` after withdrawn lots are removed. This matches the lot numbers displayed to the player in any printed catalogue analogy. The sort is applied after all filters so the lot numbers shown in the navigator reflect the original catalogue position of each horse, not their sorted rank.

---

## Testing notes

### Unit tests (pure logic)

The `filteredLots` derivation is pure given `activeLots`, `horses`, and the filter params. Extract it to a standalone function `deriveFilteredLots(activeLots, horses, filters)` for easy unit testing. Cover:

- Each filter in isolation (sex, ageBand, reserveBand, q).
- All four filters active simultaneously.
- `q` matching horse name (case-insensitive).
- `q` matching `sireName` (case-insensitive).
- `q` with no match → empty array.
- `reserveBand` boundaries: a lot at exactly $10,000 matches `10k-50k`; a lot at exactly $50,000 matches `10k-50k`.
- `sort: "reserve-asc"` and `sort: "reserve-desc"` produce correctly ordered arrays without mutating `activeLots`.
- A lot with no matching horse in the `horses` array is excluded by sex, ageBand, and q filters, but not by reserveBand.

### Integration / component tests

- Selecting a sex filter navigates and updates the displayed lot count.
- Typing in the search box triggers URL update after ~200 ms, not on every keystroke.
- Clearing the search box clears `q` from the URL (not `q=`).
- Selecting a different filter resets `lotIndex` to 0.
- When the filtered set is empty, the empty-state card is shown and the navigator is hidden.
- The Reset button is hidden when no filter is active; visible when any filter is active.
- The Sort `Select` is always visible regardless of filter state.
- Result-count line is hidden when `filteredLots.length === activeLots.length`.
- Back-navigation restores all filter params from the URL.

### Manual smoke tests

1. Open a sale with 10+ lots. Confirm "Showing N of M lots" is not visible.
2. Set Sex = Colt. Confirm only colts are shown and the result count appears.
3. Navigate to last lot, then change a filter — confirm navigator resets to Lot 1 of N.
4. Apply filters that produce 0 results — confirm empty state with Reset button appears.
5. Click Reset — all filters clear, lot navigator returns to full set.
6. Type a horse name fragment in search — confirm matching lots appear within ~200 ms.
7. Bookmark the filtered URL, reload — confirm filters and sort persist.
8. Switch to sale day for any sale — confirm filter bar is not visible (AuctionTheater renders instead).
9. Open a resolved sale — confirm filter bar is not visible (resolved branch renders instead).
