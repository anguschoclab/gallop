---
name: Primitives
description: Index of the shadcn/Radix primitives in src/components/ui/ — what to use when
type: components
status: Stable
owns: design:design-system
---

# Primitives

Gallop uses [shadcn/ui](https://ui.shadcn.com) "new-york" style ([components.json](../../../components.json)) — Radix primitives wrapped with Tailwind classes, copied into [src/components/ui/](../../../src/components/ui/) and owned by us. There are 46 of them. They consume the design tokens directly; never inline-style their internals.

This file is the **index**: when you reach for a UI part, here's the right one to use.

---

## Inputs and form

| Component                  | Use for                                                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                   | Every actionable element. Variants: `default`, `secondary`, `ghost`, `outline`, `destructive`, `link`. Sizes: `default`, `sm`, `lg`, `icon`. |
| `Input`                    | Single-line text/number input. Pair with `Label`.                                                                                            |
| `Textarea`                 | Multi-line text. Rare in Gallop — used in race naming, future commentary.                                                                    |
| `Select`                   | Dropdown for **fewer than ~12 options**. Race-screen filters use this.                                                                       |
| `Combobox` _(via Command)_ | Dropdown with **search** for >12 options (e.g. "pick a stallion").                                                                           |
| `Checkbox`                 | Boolean opt-in.                                                                                                                              |
| `Switch`                   | Boolean _toggle_ (immediate effect). Prefer `Switch` over `Checkbox` when the change applies instantly.                                      |
| `RadioGroup`               | One-of-many. ≤5 options; use `Select` above that.                                                                                            |
| `Slider`                   | Numeric range with continuous values (e.g. min Beyer filter).                                                                                |
| `Label`                    | Always pair with form inputs. Visible, never hidden via `sr-only` unless there's a strong reason.                                            |
| `Form`                     | React Hook Form integration. Errors render below the field, `text-destructive`.                                                              |
| `InputOtp`                 | Reserved (no current use case). Don't use without a decision-log entry.                                                                      |
| `Toggle`, `ToggleGroup`    | Filter pills, view switchers (e.g. "Mine / All / Top 5"). Prefer `ToggleGroup` for radio-like choices in a row.                              |

---

## Display

| Component                                                                         | Use for                                                                                                               |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `Card`, `CardHeader`, `CardContent`, `CardFooter`, `CardTitle`, `CardDescription` | Standard panel. Default radius `rounded-lg`.                                                                          |
| `Badge`                                                                           | Small categorical chip. Variants: `default`, `secondary`, `destructive`, `outline`. Use for grade tags, status chips. |
| `Avatar`                                                                          | Reserved — we don't render people. **Don't use** for horses (use the silk dot instead).                               |
| `Separator`                                                                       | Horizontal or vertical divider. Always one weight (`border-border`).                                                  |
| `Skeleton`                                                                        | Loading placeholder. Match the dimensions of what's loading.                                                          |
| `AspectRatio`                                                                     | When an image must hold a precise ratio (rare in Gallop — most imagery is fixed-pixel sprites).                       |
| `Progress`                                                                        | Determinate progress bar. Use for energy bars, training fill, season-completion.                                      |

---

## Overlays

| Component        | Use for                                                                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `Dialog`         | Modal interactions that pause the player (e.g. _PlayerRacePrompt_). Title + description always present.                                      |
| `AlertDialog`    | Destructive confirmations only (_"Retire to stud?"_).                                                                                        |
| `Sheet`          | Slide-out panel from the edge. Use for inspector panels (e.g. detail view that overlays the list).                                           |
| `Drawer`         | Bottom-up panel. Currently unused; reserved for mobile/tablet pivots.                                                                        |
| `Popover`        | Detail on a fixed element (e.g. info icon).                                                                                                  |
| `HoverCard`      | Hover-only detail (e.g. horse-name hover-preview). Don't put critical info here — touch users don't see it.                                  |
| `Tooltip`        | Single-line help on hover/focus. **Mandatory** for jargon terms (see [02-voice/02-ux-copy-patterns.md](../02-voice/02-ux-copy-patterns.md)). |
| `Sonner` (Toast) | Transient feedback ("Bid placed", "Could not save"). Top-right, ~4s.                                                                         |

---

## Navigation

| Component               | Use for                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `NavigationMenu`        | Top-bar mega-menu. Currently unused — we use a sidebar (`AppShell`). Reserved if/when we add a top bar. |
| `Breadcrumb`            | Multi-level pages (e.g. Stable → Horse → Pedigree → Ancestor). Use sparingly.                           |
| `Menubar`               | Reserved — desktop-style top menu. Don't introduce without a strong reason.                             |
| `Pagination`            | Use for any list >50 items. Don't paginate <20 items.                                                   |
| `Tabs`                  | Sibling views of the same data (e.g. horse detail: stats / pedigree / record). Don't nest tabs.         |
| `Sidebar` _(component)_ | Underlying primitive used by `AppShell`. Most screens don't use this directly.                          |
| `DropdownMenu`          | Right-click style or "more" actions. Pair with `MoreVertical` icon.                                     |
| `ContextMenu`           | Right-click only. Currently unused — reserved.                                                          |
| `Command`               | Keyboard-driven palette (Cmd-K). Future feature; reserved.                                              |

---

## Data

| Component                                                    | Use for                                                                                                                               |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell` | Any tabular data. Always set `tabular-nums` on numeric `TableCell`s.                                                                  |
| `Chart`                                                      | Recharts wrapper. See [03-data-visualization.md](03-data-visualization.md).                                                           |
| `Calendar`                                                   | Date picker. The race calendars use a custom layout, not this primitive — they need a horizontal week-view that this doesn't provide. |
| `Carousel`                                                   | Reserved. Currently unused; consider before introducing — carousels hide content.                                                     |
| `Accordion`                                                  | Progressive disclosure. Use for FAQ-like sections, optional detail.                                                                   |
| `Collapsible`                                                | Single-section accordion (no group).                                                                                                  |
| `ScrollArea`                                                 | Custom scrollbar styling. Use only when default scrolling looks wrong (e.g. inside a sheet).                                          |
| `Resizable`                                                  | Two-pane layouts with user-resizable splitter. Currently unused; reserved.                                                            |

---

## When to compose vs. when to extend

- **Compose** — most of the time. Wrap primitives in a domain component (e.g. `HorseCard` is a `Card` with specific content).
- **Extend** — when the primitive itself has the wrong defaults. Edit it in `src/components/ui/`. Document the change.
- **Replace** — never. If you need a different primitive, check shadcn for an alternative; only build new if neither covers the case.

The decision tree is in [08-extending/02-how-to-add-a-component.md](../08-extending/02-how-to-add-a-component.md).

---

## What we don't do

- **Don't restyle Buttons via inline classes** that change colours or borders. Use a variant; if no variant fits, add one.
- **Don't import a different toast library.** `Sonner` is our toast.
- **Don't render plain `<input>` elements.** Always use `Input`.
- **Don't write your own dialog with `position: fixed`.** Use `Dialog` or `Sheet`.

---

## Open questions

- Do we need a project-specific `<NumericInput>` primitive that handles `tabular-nums`, alignment, and locale-aware separators automatically? Probably yes, before we add many more forms.
