---
name: How to add a screen
description: From first sketch to shipped — adding a new screen the right way
type: extending
status: Stable
owns: engineering:documentation
---

# How to add a screen

Adding a screen is the heaviest extension we make. It introduces a new destination, a new URL, new copy, new components, new state. Get it right by doing it the same way every time.

---

## Step 0 — Justify it

Before sketching, answer:

- **What persona does this screen serve?** ([00-foundations/03-personas-and-research.md](../00-foundations/03-personas-and-research.md).) If the answer is "all of them but vaguely", the screen probably shouldn't exist.
- **What's the primary verb?** If you can't name it in one word, the screen is two screens.
- **Where in the day-loop / race-loop / breeding-loop does it sit?** ([06-flows/01-core-loops.md](../06-flows/01-core-loops.md).) If it doesn't sit cleanly in any, it might be a sub-route of an existing screen.

If the answers are sharp, proceed. If they're fuzzy, talk to product first.

---

## Step 1 — Spec it

Copy [05-screens/00-screen-template.md](../05-screens/00-screen-template.md) to a new file:

- Name: `05-screens/NN-screen-name.md` (next number).
- Status: `Draft`.

Fill every section. Don't write code yet.

The act of writing the spec surfaces 80% of the open questions. Don't skip this and "spec by code" — it's slower in net.

---

## Step 2 — Review the spec

Bring the draft to:

- A designer (mantra alignment, persona check).
- An engineer (component / token / data feasibility).
- Optionally product (verb / loop fit).

Iterate. Status moves to `Needs review` until both sign-off.

---

## Step 3 — Implement it

### Route

- Create `src/routes/route-name.tsx` (or `route-name.$param.tsx` for dynamic).
- Use `createFileRoute("/route-name")` from TanStack Router.
- Export a route component matching the screen name.

### Layout

- Default: live inside `AppShell` automatically (any path that doesn't start with `/race/`).
- Full-bleed: only if your screen file justifies it. Edit [AppShell.tsx](../../../src/components/AppShell.tsx) `isRace` check, or refactor to a generic full-bleed pattern (decision log entry required).

### Navigation

- If the screen is **top-level**, add an entry to `navItems` in [AppShell.tsx](../../../src/components/AppShell.tsx). The 7-item nav is deliberate — adding an 8th needs vision-level approval.
- If the screen is **drill-in only** (e.g. detail of a list item), no nav entry is needed.

### Filters and state

- Filters live in URL search params (TanStack Router).
- Component state is fine for ephemeral UI (modal open, hover).

### Copy

- Copy table from your spec → render as React. Don't invent new copy at implementation time.

### States

- Implement default, loading, empty, error, and screen-specific states from your spec.
- Use `Skeleton` for loading.
- Use the empty-state pattern from [04-patterns/03-empty-loading-error.md](../04-patterns/03-empty-loading-error.md).

---

## Step 4 — Walk the critique heuristics

Run [07-quality/02-critique-heuristics.md](../07-quality/02-critique-heuristics.md) on your own work before opening a PR. The seven-point pass takes 4 minutes and catches the most regressions.

---

## Step 5 — Verify accessibility

- Tab through with keyboard only.
- Run an automated contrast audit.
- Test with reduced motion enabled.

[07-quality/01-accessibility.md](../07-quality/01-accessibility.md).

---

## Step 6 — Open a PR

- Reference the screen spec file in the PR body.
- Note any new tokens, components, or copy patterns introduced.
- Note any open questions the spec didn't resolve (these become engineering follow-ups).

The PR template should ask:

- [ ] Screen file in `docs/design-bible/05-screens/` exists.
- [ ] Components used are documented (or a doc PR is open).
- [ ] No inline hex / rgb / oklch values.
- [ ] All numeric columns use `tabular-nums`.
- [ ] Empty / loading / error states implemented.
- [ ] Reduced-motion contract honoured.

---

## Step 7 — After merge

- Move screen file status to `Stable`.
- If your screen introduced a non-obvious decision, append to [04-decision-log.md](04-decision-log.md).
- If a future screen would benefit from the same pattern, consider promoting an inline component to `src/components/` (see [02-how-to-add-a-component.md](02-how-to-add-a-component.md)).

---

## Dry-run: a hypothetical "Jockey roster" screen

To prove the system holds, here's a thought experiment.

**Step 0** — Persona: Maya (form study), Tomás (jockey-stallion connections). Verb: _Browse_. Loop: day loop.

**Step 1** — Spec:

- Route: `/jockeys` (top-level — needs nav entry).
- Layout: AppShell.
- Components: `Card`, `Table`, new `JockeyCard` (domain component).
- New tokens: none — uses existing palette.
- New copy: title _"Jockeys"_, empty state _"No jockeys signed yet."_, filter labels.
- States: default, filtered empty, no jockeys (first session).

**Step 2** — Review surfaces: do we want jockeys at top-level nav, or under a `/staff` umbrella? (Open question logged on the spec.)

**Step 3** — Implementation: copy `stable.tsx` as the closest peer, swap horse-shaped data for jockey-shaped, follow filter conventions.

**Step 4-7** — As above.

**Verdict.** The system is sufficient. Tokens cover it; components compose; states have patterns; copy has a voice. The only open question (top-level vs. `/staff` umbrella) is a _product_ question, not a _design_ question.

This is what extensibility looks like.

---

## Open questions

- Should we adopt a per-screen Storybook entry as part of the screen-add workflow?
- Do we want PR templates to enforce the checklist machine-readably?
