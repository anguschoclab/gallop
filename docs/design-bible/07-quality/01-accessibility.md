---
name: Accessibility
description: WCAG 2.1 AA targets, contrast, focus, live regions, reduced motion
type: quality
status: Stable
owns: design:accessibility-review
---

# Accessibility

Gallop targets **WCAG 2.1 Level AA** as the floor, with race-screen-specific contracts on top. Accessibility is not an afterthought — it is part of "ship-ready".

This file lists the rules, the test plan, and the open work.

---

## Contrast

All text must meet:

- **4.5:1** for normal text.
- **3:1** for large text (≥24px or ≥18.66px bold).
- **3:1** for non-text UI (focus rings, borders that carry meaning, icons that aren't decorative).

**Verified-OK pairings.**

| Foreground / background                    | Theme               | Notes                                                                                                         |
| ------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `text-foreground` on `bg-background`       | Light               | Built into the OKLCH design.                                                                                  |
| `text-foreground` on `bg-card`             | Light               | Card surface inherits backdrop.                                                                               |
| `text-muted-foreground` on `bg-background` | Light               | Verified ≥4.5:1.                                                                                              |
| `text-muted-foreground` on `bg-muted`      | Light               | Borderline — verify before relying on it for body copy. **Don't put long copy on `bg-muted` in light theme.** |
| `text-primary-foreground` on `bg-primary`  | Both                | Token pair guarantees inversion contrast.                                                                     |
| White on emerald-950 (race screen)         | Broadcast (current) | Verified ~10:1.                                                                                               |
| White-at-70% on emerald-950                | Broadcast (current) | ~7:1 — OK for secondary text.                                                                                 |

**Things to watch.**

- **Yellow-400 Beyer badges** on emerald-950: contrast ~6:1 — OK at the badge's tiny size, but don't push to long copy.
- **Silk colours** on the race screen: silks are user-facing identifiers, not text — the white border around the silk dot is what carries the accessibility role. Never put text directly on a silk colour.
- **`text-muted-foreground` on `bg-muted/30`**: the dashboard's subtle backdrop. Verified at edge of allowed; don't reduce it further.

---

## Focus

Focus must be visible at all times. Radix primitives ship with `focus-visible:ring-ring` rings — keep them, don't override.

**Rules.**

- **Default ring** is `ring-2 ring-ring ring-offset-2` for solid surfaces, `ring-2 ring-ring` (no offset) on transparent surfaces.
- **Focus order** follows DOM order. If you need a different order, fix the DOM, don't use `tabindex` other than `0` or `-1`.
- **Skip-to-content** link present on every screen — currently TBD; treat as open work.
- **Focus trap** in `Dialog` and `AlertDialog` (Radix handles this).
- **Focus return** when a modal closes: focus returns to the trigger.

**Race screen specific.** Focus order: speed buttons → live order sort → live order filter → min Beyer slider. Track and horse positions are not focusable (they update too fast and carry no actionable meaning).

---

## Keyboard

Every interaction must be possible without a mouse.

| Pattern                 | Keys                                                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Activate button         | `Enter` or `Space`                                                                                                         |
| Open dropdown           | `Enter` / `Space`                                                                                                          |
| Navigate dropdown       | Arrow keys                                                                                                                 |
| Close dropdown / dialog | `Esc`                                                                                                                      |
| Move between tabs       | Arrow keys (Radix Tabs default)                                                                                            |
| Sort table column       | `Enter` on the header button                                                                                               |
| Race speed              | `1`, `2`, `4` (race screen only — see [04-patterns/04-interaction-patterns.md](../04-patterns/04-interaction-patterns.md)) |
| Pause / resume race     | `Space` (when implemented)                                                                                                 |

**Test rule.** A reviewer must be able to play through a complete day without touching the mouse.

---

## Screen-reader contracts

### Static labels

- All form inputs have a `<Label>`. Visible, never hidden via `sr-only` unless there's a strong contextual reason.
- All icon-only buttons have a `<Tooltip>` (which Radix exposes as `aria-label`).
- All decorative icons have `aria-hidden="true"`.

### Live regions

| Surface                  | Region          | Politeness                           |
| ------------------------ | --------------- | ------------------------------------ |
| Toasts (`Sonner`)        | Built-in        | polite                               |
| Day-advance announcement | Dashboard       | polite                               |
| Race-screen race calls   | `/race/$raceId` | polite                               |
| Race-screen finish       | `/race/$raceId` | assertive (single announcement only) |
| Outbid notification      | Auction         | polite                               |

**Race screen live calls** are throttled to one announcement per 3 seconds. Phrasing examples:

- _"Stardust now leading by half a length."_
- _"Stardust drops to 2nd at the turn."_
- _"Stardust finishes 1st in 92.4 seconds."_

The throttle is essential. Without it, the screen-reader user is drowned in updates and gets less, not more.

### Tables

- `<table>` with proper `<thead>` / `<tbody>`.
- Sortable columns: `aria-sort="ascending|descending|none"` on the `<th>`.
- Row click (drill-in) requires the row to be a real link, not a click handler on a `<tr>`.

---

## Reduced motion

Honour `prefers-reduced-motion: reduce` everywhere. See [01-design-system/04-motion.md](../01-design-system/04-motion.md) for the global contract.

**Race screen specifics.**

- No pulse on horses (silk dot stays static).
- No sprite animation (sprite shows frame-1 only).
- Position updates remain — they carry information.
- Result overlay appears instantly (no fade).

---

## Colour-only signals are forbidden

Anything that uses colour to mean something must also have a non-colour signal:

| Colour signal           | Required pair                       |
| ----------------------- | ----------------------------------- |
| Red error border        | Error message text                  |
| Green "eligible" pill   | The word _"Eligible"_               |
| Yellow Beyer-high badge | The figure itself, plus tooltip     |
| Silk dot identity       | Always paired with the horse's name |

---

## Touch targets

Minimum tappable size: **44×44 px** for any control on a touch surface.

Today, our `Button size="sm"` lands at 32px tall, which is fine on desktop but borderline on tablet. Open work: introduce a `size="touch"` variant for tablet-mode UI.

---

## Test plan

Run before any release:

1. **Keyboard-only walkthrough** — complete a day loop without the mouse.
2. **Screen-reader walkthrough** — VoiceOver (macOS) and NVDA (Windows) on the dashboard, stable, race screen.
3. **Contrast audit** — automated (axe, Lighthouse) on each screen.
4. **Reduced-motion audit** — set OS preference, walk through every animation.
5. **Zoom audit** — zoom to 200% on each screen; layout must not break.

---

## Open work

- Skip-to-content link on every screen.
- Race-screen live region (G6 in [05-screens/04-race-viewer.md](../05-screens/04-race-viewer.md)).
- Touch-friendly button size variant.
- High-contrast theme variant — research only at this stage.

---

## Open questions

- Does any of our chart imagery need a textual table alternative as a sibling, or is the tooltip sufficient? Probably need the table for screen readers.
- Is the in-game date format (_"Year 3, Apr 14"_) accessible to all locales? Yes for screen readers; verify for cognitive accessibility.
