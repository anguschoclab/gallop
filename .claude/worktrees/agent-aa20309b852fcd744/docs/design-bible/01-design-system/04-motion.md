---
name: Motion
description: When to animate, how long, what easing, and the reduced-motion contract
type: design-system
status: Stable
owns: design:design-system
---

# Motion

Animation in Gallop has one job: tell the user *something happened*. It is never decoration.

We use `tw-animate-css` (imported in [styles.css](../../../src/styles.css)) for the standard library, plus targeted CSS animations on the race screen. No Framer Motion, no GSAP — adding either requires a decision-log entry.

---

## The four motion budgets

| Budget | Duration | Easing | Use |
|---|---|---|---|
| **Instant** | 75ms | `ease-out` | Hover, focus ring, colour-only transitions. Don't make the user wait to see they hit the right thing. |
| **Quick** | 150ms | `ease-out` | Selection, toggle, in-place reveal (skeleton → content). |
| **Standard** | 250ms | `ease-in-out` | Modal open, sheet slide, accordion expand. The "page is doing something" tier. |
| **Deliberate** | 400–600ms | `ease-out` | Race-screen overlays, finish-line moments, large layout shifts. Reserved. |

**Rule:** the more important the transition, the *longer* it is, never *flashier*. We don't bounce, spring, or scale-overshoot.

---

## Easing

Standard set:

- **`ease-out`** — the default. Things start fast and settle.
- **`ease-in-out`** — for two-direction transitions (modal open and close).
- **`linear`** — only for continuous animations (race-screen pulse, indeterminate progress).

We do **not** use cubic-bezier curves with overshoot (`cubic-bezier(0.4, 0, 0.2, 1.4)` and friends). They feel toy-like; this product is grown-up.

---

## Race screen — the special case

The live race is a 30–60 second continuous animation, not a discrete transition. It runs on `requestAnimationFrame` with a fixed 50ms physics tick (see [race.$raceId.tsx:129](../../../src/routes/race.$raceId.tsx)).

| Element | Animation |
|---|---|
| Horse sprite (running) | `pulse 0.5s ease-in-out infinite` (CSS keyframes). |
| Horse position along track | None (positions update via inline-style left% on each `tick`). |
| Track surface | None — backgrounds are static; future: subtle parallax. |
| Sky banner | None — weather is a static photograph mood-piece. |
| Finish overlay | Fade-in with backdrop blur (250ms, standard budget). |

**Drift to fix:** the pulse is hardcoded. It should become a token (`--motion-race-pulse`) for consistency. See [05-screens/04-race-viewer.md](../05-screens/04-race-viewer.md).

---

## The `prefers-reduced-motion` contract

We respect the OS-level reduced-motion preference everywhere:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**On the race screen specifically**, reduced-motion users get:
- No pulse on horses (silk dot stays static).
- Position still updates (it carries information).
- The result overlay appears instantly, no fade.

**Test rule:** every screen must remain fully functional with reduced motion on. If you can't tell a button is pressed without the press animation, the design is wrong.

---

## What we never animate

- **Numbers.** A Beyer figure does not count up. A cash balance does not roll up. The new value just appears, instantly.
- **Hover-only decorative elements.** Cards do not "lift" on hover. We use `hover:bg-accent` (colour change, no transform).
- **Page transitions between routes.** Routes swap instantly. We're not a marketing site.

---

## Skeletons (loading)

Use `<Skeleton />` from [src/components/ui/skeleton.tsx](../../../src/components/ui/skeleton.tsx). It carries a quiet pulse (the standard library's `animate-pulse`) — that's our entire loading-state vocabulary. No spinners, no progress bars, no shimmer effects.

---

## Open questions

- Should the race-screen finish-line moment have a deliberate flash effect, or is the fade-overlay enough?
- Do we need a "value changed" subtle highlight on numeric cells (e.g. when a horse's Beyer recalculates), or does it conflict with "we never animate numbers"?
