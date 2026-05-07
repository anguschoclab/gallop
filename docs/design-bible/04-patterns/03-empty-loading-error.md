---
name: Empty, loading, error
description: Three states that decide how the product feels in real conditions
type: pattern
status: Stable
owns: design:design-system
---

# Empty, loading, error

Most UIs ship the happy path well. The state of a sim like Gallop is most-of-the-time _not_ on the happy path — a brand-new save is empty, a refreshed view is loading, a network blip means the auction failed. These three states are first-class.

---

## Empty states

See [02-voice/02-ux-copy-patterns.md](../02-voice/02-ux-copy-patterns.md) for the copy formula. Visual treatment:

- **Container:** centred in the available area, `text-center`, `py-12` to give it air.
- **Optional icon:** Lucide, `h-10 w-10`, `text-muted-foreground/40`. Use sparingly — most empty states don't need an icon.
- **Heading:** `text-base font-medium`.
- **Subtitle:** `text-sm text-muted-foreground`.
- **CTA:** `Button` (default variant) — _one_ primary action only.

**Examples:**

```tsx
// stable, no horses
<div className="text-center py-12">
  <Trophy className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
  <p className="text-base font-medium">No horses yet</p>
  <p className="text-sm text-muted-foreground mt-1">Visit the auction or breed your first foal.</p>
  <Button className="mt-4" asChild>
    <Link to="/auction">Browse auction</Link>
  </Button>
</div>
```

```tsx
// race browser, no eligible races
<div className="text-center py-12">
  <p className="text-base font-medium">No races match your filters</p>
  <Button variant="ghost" size="sm" className="mt-3" onClick={resetFilters}>
    Reset filters
  </Button>
</div>
```

**Don't** show empty states with confessional language ("Sorry!", "Whoops!"). Don't show empty states without next steps unless the empty _is_ the truth (e.g. "No races today" is fine if there are genuinely none).

---

## Loading states

Gallop loads fast (most state is in-memory), so loading appears most often during route transitions and external fetches.

### Skeletons

Use `<Skeleton />` ([src/components/ui/skeleton.tsx](../../../src/components/ui/skeleton.tsx)). Match the dimensions of the real content:

```tsx
<div className="space-y-3">
  <Skeleton className="h-6 w-1/3" /> {/* title */}
  <Skeleton className="h-4 w-1/2" /> {/* subtitle */}
  <Skeleton className="h-32 w-full rounded-lg" /> {/* card */}
</div>
```

**Rule:** the skeleton's shape predicts the content's shape. The user shouldn't be surprised when content arrives.

### When skeletons aren't right

- **< 100ms loads** — show nothing. The skeleton flash is more disorienting than the brief blank.
- **Mid-action, button-bound loads** — the button itself shows the progressive verb (_"Saving…"_) and disables. No skeleton needed.
- **Charts that need data to compute** — show the skeleton sized to the chart's eventual area, not a generic spinner.

### Spinners

Avoid. The only acceptable spinner is inside a button (`Loader2` from Lucide, `animate-spin`), and only if the action is truly indeterminate.

---

## Error states

Errors come at three scopes:

### Field-level (form input)

Render below the input, `text-destructive text-xs`. The `Form` primitive handles this for free.

```
[Bid amount: $4,500]
└ Not enough cash. You have $4,000.
```

### Action-level (button click)

Toast via `<Sonner>`. Top-right, ~4 seconds, dismissible.

```tsx
toast.error("Couldn't place bid", {
  description: "Try again or reload the page.",
});
```

### Page-level (route data failed)

Centred card. Explain plainly, offer recovery.

```tsx
<div className="text-center py-16">
  <p className="text-base font-medium">Couldn't load this race</p>
  <p className="text-sm text-muted-foreground mt-1">The race may have been resolved or removed.</p>
  <div className="flex gap-2 justify-center mt-4">
    <Button variant="ghost" onClick={retry}>
      Retry
    </Button>
    <Button asChild>
      <Link to="/races">Back to races</Link>
    </Button>
  </div>
</div>
```

### Don't

- **Don't dump a stack trace.** The player isn't a developer.
- **Don't hide errors.** Better to show a 1-line plain message than to silently fall back.
- **Don't use red on the whole page.** Errors are localised; the page chrome stays calm.

---

## A note on the race screen

The race screen has unique not-found, in-progress, and resolved states:

- **Not found** ([race.$raceId.tsx:77–83](../../../src/routes/race.$raceId.tsx)) — page-level error pattern, centred card, link back.
- **Already resolved** — _"This race has already been run."_ + _"Back to races"_ button. (Already implemented.)
- **In progress** — the live track _is_ the loading state. No skeleton needed.

---

## Open questions

- Should empty states animate in (fade) when the data resolves to empty? Currently no.
- Toast positions — top-right is current; should race-screen toasts be top-centre to stay out of the leaderboard?
