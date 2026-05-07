---
name: How to add a component
description: Decision tree and steps for introducing a new reusable component
type: extending
status: Stable
owns: design:design-system
---

# How to add a component

Adding a component is heavier than adding a token. Components carry behaviour, state, and a contract. Get the placement right the first time — moving a component later is much harder than moving a token.

---

## The decision tree

```
Do I need this component, or am I about to invent something that already exists?
│
├── Already exists in src/components/ui/   → use it as-is.
├── Already exists in src/components/      → use it; if it doesn't fit, propose an enhancement.
│
└── Genuinely new
    │
    ├── Is it generic (could it appear in any product)?      → primitive (src/components/ui/)
    │   ├── Yes  → try shadcn first; copy in if available.
    │   └── No   → don't write it as a primitive.
    │
    └── Is it domain-specific (knows about horses, races, breeding)?
        │
        ├── Used by ≥2 screens             → domain component (src/components/)
        ├── Used by exactly 1 screen        → keep it inline; revisit when a 2nd use case appears
        │
        └── Race-screen-specific
            │
            ├── Used by ≥2 race surfaces   → src/components/race/
            └── Used by exactly 1           → inline in the route file
```

**Lesson:** the codebase has a specific shape. Match it. Don't sprinkle "shared utility" components across random folders.

---

## Where each kind lives

| Kind | Folder | Examples |
|---|---|---|
| **Primitive** (Radix wrapper) | [src/components/ui/](../../../src/components/ui/) | `Button`, `Card`, `Tooltip` |
| **Domain** (knows the racing world) | [src/components/](../../../src/components/) | `HorseCard`, `BeyerBadge`, `Lineage` |
| **Race-only** (live race screen) | `src/components/race/` (when needed) | future `RaceCommentary`, `OddsBoard` |
| **Page-local** (only used by one route) | inline in the route file | one-off layout tweaks |

---

## Steps for a new domain component

### 1. File and naming

- Create `src/components/ComponentName.tsx`.
- Export the React component matching the file name: `export function ComponentName(...)`.
- Use PascalCase. No `Container` / `Wrapper` / `Layout` suffixes.

### 2. Composition

- Compose primitives from `src/components/ui/`. Don't reach for raw HTML when a primitive exists.
- Consume tokens via Tailwind utilities. Never inline hex / oklch / rgb (silks are the documented exception).
- If you need a colour that doesn't exist, follow [01-how-to-add-a-token.md](01-how-to-add-a-token.md) first.

### 3. Props

- Make props minimal and explicit. Pass the full domain object (`horse: Horse`) when the component is *about* that object; pass only what you need otherwise.
- Default behaviours go in the component, not at every call site. If `HorseCard` has a "compact" variant, that's a `variant` prop with sensible defaults.

### 4. States

- Default.
- Loading (if applicable).
- Empty (if the component shows "0 of something").
- Error (if it can fail to render — rare for pure-data components).

### 5. Document it

Add to the right index file:

- Primitive → [03-components/01-primitives.md](../03-components/01-primitives.md).
- Domain → [03-components/02-domain-components.md](../03-components/02-domain-components.md).
- Chart → [03-components/03-data-visualization.md](../03-components/03-data-visualization.md).

Each entry should have:
- One sentence on what it is.
- One sentence on when to use it.
- The file path link.
- Any non-obvious rules.

### 6. Test

- Visual regression in storybook (when we have one).
- Snapshot or behaviour test if the component has logic.
- Accessibility: tab order, focus rings, aria attributes per [07-quality/01-accessibility.md](../07-quality/01-accessibility.md).

---

## When to enhance an existing component vs. create a new one

| Scenario | Action |
|---|---|
| `HorseCard` looks slightly different on the auction screen | Add a `variant` prop to `HorseCard`. |
| Auction screen needs a card with bid affordances | New `LotCard` component. (Auction-specific.) |
| Need a card that shows a horse and a race | New domain component (composes both). |
| Need a primitive button with a loading state | Enhance `Button` (add `loading` prop). Don't fork. |

**Rule of thumb:** if the new behaviour is a *style variant* of the existing component, extend it. If it's a *semantic difference*, create a new component.

---

## Anti-patterns

- **Don't** create a `<HorsePicker />` if you already have a `<Combobox />` with horse data — that's a *use case*, not a component.
- **Don't** export sub-components from the same file unless they're tightly coupled (`Card`, `CardHeader`, `CardContent` is fine; `HorseCard`, `HorseStatsRadar`, `HorseTimeline` is not).
- **Don't** prop-drill data deep into a component. Use a context for cross-cutting concerns (e.g. selected horse).
- **Don't** ship a component without an entry in this bible. The "where do I look" question must always have an answer.

---

## Versioning components

We don't version components — they live in the codebase, edited in place. If a breaking change is needed:

1. Make the change.
2. Update every call site.
3. Append a [decision log](04-decision-log.md) entry if the contract change is non-trivial.

We never deprecate a component while keeping the old one. *One way to do a thing* is a feature.

---

## Open questions

- Should we adopt **Storybook** to make component states browsable? Probably yes, low priority.
- Do we want a `cva` (class-variance-authority) layer for variant management? Today we use ad-hoc booleans — could become unwieldy as variants grow.
