---
name: Interaction patterns
description: Selection, comparison, drawer-vs-dialog, keyboard shortcuts, playback controls
type: pattern
status: Stable
owns: design:design-system
---

# Interaction patterns

Repeating moves the player makes across the game. Each pattern is documented once here; screen specs reference it.

---

## Selection

| Mode | Pattern |
|---|---|
| **Single-select in a list** | Tap the row → drill into detail (route change). |
| **Side-by-side preview** | Tap the row → open `Sheet` from right; row stays selected (`bg-accent`). Useful when player wants to scan many. |
| **Multi-select** | Checkbox column appears when first item is `cmd+click`'d, or via "Select" button. Action bar slides in at bottom. |

We **don't** use:
- Right-click menus for selection (touch users miss them).
- Drag-to-select rectangles (overkill for our list lengths).

---

## Comparison

When the player wants to compare horses (Maya's bread and butter):

1. Multi-select two or more in the stable list.
2. Action bar shows *"Compare"* button.
3. Click → `HorseCompare` opens (full route or `Sheet`, depending on count).

If only two are selected, a `Sheet` is enough. Three or more deserves a dedicated route so the player can resize.

---

## Drawer vs. dialog vs. sheet vs. popover

The decision tree:

```
Does it interrupt? (player must respond before continuing)
│
├── Yes: it's destructive or critical?
│   ├── Yes → AlertDialog
│   └── No  → Dialog
│
└── No: does it need to stay open while player acts on the underlying screen?
    │
    ├── Yes: is it tied to a specific element?
    │   ├── Yes → Popover / HoverCard
    │   └── No  → Sheet (slides in from edge)
    │
    └── No: it's transient feedback → Sonner toast
```

**Sheets** are usually right for "inspect detail without losing context". **Dialogs** are for "decide something now".

---

## Confirmation pattern (destructive)

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Retire to stud</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Retire Stardust to stud?</AlertDialogTitle>
      <AlertDialogDescription>
        He won't race again.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction>Retire Stardust</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

Copy pattern in [02-voice/02-ux-copy-patterns.md](../02-voice/02-ux-copy-patterns.md).

---

## Keyboard shortcuts

The base set, available on every screen:

| Key | Action |
|---|---|
| `?` | Show shortcut help (overlay). |
| `Esc` | Close the topmost dialog/sheet/popover. |
| `Cmd/Ctrl + K` | Command palette (future). |
| `g d` | Go to dashboard. |
| `g s` | Go to stable. |
| `g r` | Go to races. |

Race screen adds:

| Key | Action |
|---|---|
| `1` | Speed 1×. |
| `2` | Speed 2×. |
| `4` | Speed 4×. |
| `Space` | Pause / resume (when implemented — currently not supported). |

When you add a shortcut, document it here.

---

## Playback controls (race screen)

The race screen's playback model is:

- **Live, deterministic, unstoppable** today (no pause).
- **Speed 1× / 2× / 4×** via header buttons.
- **Speed change updates `speedRef.current`** — physics still runs at fixed 50ms ticks; speed multiplies the accumulator drain.

**The full playback control surface (target state):**

| Control | Behaviour | Status |
|---|---|---|
| Play / pause | Suspends RAF loop. Resumes from same simTime. | Not implemented. |
| Speed selector | 1×, 2×, 4×, optionally 0.5× for replay scrutiny. | Partially (1/2/4 only). |
| Scrub | Seek along the timeline. Requires recording every fixed-tick state. | Not implemented. |
| Replay | Re-run the same race from the seeded RNG. | Inherent (route refresh works). |
| Skip to result | Jump straight to result overlay. | Not implemented. |

Adding pause/scrub is in the [Race viewer screen spec](../05-screens/04-race-viewer.md) gap analysis.

---

## Form patterns

- **Submit** — primary CTA bottom-right of the form.
- **Cancel** — `ghost` variant to its left.
- **Inline validation** — on blur, not on every keystroke. Save the user from premature red.
- **Prevent double-submit** — disable the button while in flight; change verb to progressive (*"Submitting…"*).
- **Field labels** — always visible, never floating. Floating labels save 16px and cost legibility.

---

## Tooltip pattern

Always available on:
- Truncated text (with title attribute fallback).
- Jargon terms.
- Icon-only buttons.

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button size="icon" variant="ghost"><Settings className="h-4 w-4" /></Button>
  </TooltipTrigger>
  <TooltipContent>AutoSim settings</TooltipContent>
</Tooltip>
```

Don't place tooltips on:
- Visible buttons with clear labels.
- Anything moving (the race screen mid-race).
- Things the player needs while another tooltip is open.

---

## Drag and drop

Currently unused. Reserved for future features (training-plan reordering, breeding queue). When introduced, must:
- Keep keyboard equivalent.
- Show a clear drop target (border or `bg-accent`).
- Snap, never free-position.

---

## Open questions

- Do we want to support gesture controls (swipe, pinch) on tablet? Out of scope for v1.
- Should there be a "compare drawer" persistent panel that the player adds horses to over time? Tomás would like it.
