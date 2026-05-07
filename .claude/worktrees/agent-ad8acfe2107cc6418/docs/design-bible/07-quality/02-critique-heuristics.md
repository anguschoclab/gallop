---
name: Critique heuristics
description: The Gallop checklist — how to review a screen and spot regressions
type: quality
status: Stable
owns: design:design-critique
---

# Critique heuristics

A short, opinionated checklist for reviewing a screen — your own or a teammate's. Walk it top-to-bottom; the first principle that surfaces a problem is usually the right one to fix.

This is the practical cousin of [00-foundations/02-design-principles.md](../00-foundations/02-design-principles.md) — the principles are *what we believe*; this file is *how to check*.

---

## The seven-point pass

### 1. The mantra (60 seconds)

Stand back. Squint.

- Are the **numbers** the protagonist, or do icons / decoration steal the eye?
- Does the screen feel **authentic** (real terms, real units), or have we softened to "approachable" mush?
- Is there a thread of **race day** — silk, surface, weather, accent? Even on a calm screen?

If any of these read soft, fix the screen before continuing.

### 2. One verb (30 seconds)

- What is the **primary verb** of this screen?
- Is the primary CTA the *only* default-variant button visible without scroll?
- Are the secondary actions appropriately demoted (`ghost`, `outline`, `secondary`)?

If you can't name the verb, you don't have a screen — you have a list of functions.

### 3. State visibility (60 seconds)

- Have you specified the **empty** state? With copy and CTA?
- Have you specified the **loading** state? With skeletons matching shape?
- Have you specified the **error** state? At what scope (field / action / page)?
- Have you specified all the **screen-specific states** (e.g. resolved, retired, in foal)?

The screen is not done until every state is.

### 4. Density (45 seconds)

- Are numbers `tabular-nums`?
- Are columns of numbers right-aligned with fixed widths?
- Are gaps consistent (12 / 16 / 24)?
- Has the screen breathed where it should (`gap-6` between sections)?

Density without breath is claustrophobia. Breath without density is condescension.

### 5. Tokens, not hex (30 seconds)

Search the diff for:
- `#` (hex codes) — outside the race screen, **none allowed**.
- `rgb(` / `oklch(` — same rule.
- Inline `style={{ backgroundColor: ... }}` — only acceptable for silks (which are user-data colours).

Every other colour comes from a token. Every spacing comes from the Tailwind scale.

### 6. Voice (45 seconds)

Read every word on the screen out loud.

- Any **"Click here"**? — fix it.
- Any **"Oops!"** / **"Sorry!"** / **exclamation marks**? — fix them.
- Any jargon term **without a tooltip**? — add one.
- Are buttons **verb-phrased** ("Train Stardust", not "Submit")?
- Are numbers **formatted to spec** ($, m, %)?

### 7. Accessibility (60 seconds)

- Tab through the screen. Can you reach everything?
- Activate every interactive element with `Enter` / `Space`.
- Trigger an empty state. Does it announce?
- Toggle reduced motion. Does anything break?
- Run an automated contrast audit (axe).

---

## Common regressions to watch for

These are the failure modes that creep back in after every refactor:

| Symptom | Underlying cause | Fix |
|---|---|---|
| Numbers don't align in a column | `tabular-nums` missing | Add it on the parent. |
| Inline hex code | Convenience colour for "this one case" | Convert to a token, or define a new one. |
| Tooltipless jargon | Designer assumed glossary covered it | Add `<Tooltip>` on first appearance per screen. |
| Two equally-prominent CTAs | "We didn't know which was primary" | Pick one. Demote the other. |
| Modal-on-modal | Trying to fit a follow-up into the current modal | Convert to a sub-route or sheet. |
| Silent state | Loading spinner missing, or empty state not specified | Add the explicit state. |
| Race screen colour out of sync | Used inline `rgb(...)` | Pull from broadcast tokens (post-G1 — see [05-screens/04-race-viewer.md](../05-screens/04-race-viewer.md)). |

---

## Critique etiquette

When giving feedback to a teammate:

- **Lead with the principle**, not the line. *"This violates principle 1 — numbers aren't the protagonist here"* lands better than *"reduce the icon size"*.
- **Be concrete.** Point to the file:line of the offending element.
- **Distinguish must / should / could.** *"Must: tabular-nums on the Beyer column. Should: tooltip on 'Maiden'. Could: consider a sticky header."*
- **One sweep, not three.** Run the full pass once, then summarise. Don't drip critique.

---

## When to bring in a fresh pair of eyes

If you've been on a screen for >2 hours, you've stopped seeing it. Routes for a fresh pair:

- **Engineering teammate** — best for token / hex / accessibility regressions.
- **Designer teammate** — best for hierarchy / verb / mantra alignment.
- **Persona check** — re-read [00-foundations/03-personas-and-research.md](../00-foundations/03-personas-and-research.md). Imagine Maya, Tomás, Alex on the screen. Does each one know what to do?

---

## Open questions

- Do we want to formalise this as a **PR template checklist** so design-system regressions get caught at code review? Probably yes.
- Should we maintain a *gallery of fixed regressions* (before/after) as a teaching tool? Reserve the idea.
