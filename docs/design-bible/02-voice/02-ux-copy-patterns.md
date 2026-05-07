---
name: UX copy patterns
description: Concrete patterns for buttons, errors, empty states, numbers, and jargon
type: voice
status: Stable
owns: design:ux-copy
---

# UX copy patterns

Voice is the high-level mood; this is the working manual. Copy across Gallop should follow these patterns _to the letter_.

---

## Buttons

Format: **Verb + (object)**. Always sentence-case. No periods.

| Good             | Bad                                               |
| ---------------- | ------------------------------------------------- |
| _Train Stardust_ | _Click to train_                                  |
| _Enter race_     | _Submit_                                          |
| _Confirm bid_    | _OK_                                              |
| _Retire to stud_ | _Continue_ (where 'continue' is doing the action) |
| _Advance day_    | _Next_                                            |
| _Watch live_     | _Go to race_                                      |

**Primary CTA** uses `<Button>` (default variant) and is **the only one** at default emphasis on the screen. Everything else is `secondary`, `ghost`, or `outline`.

**Destructive CTAs** use `<Button variant="destructive">` and the verb names the destruction: _"Sell Stardust"_, _"Scratch from race"_, _"Delete save"_.

**Loading state** changes the verb to its progressive form: _"Training…"_, _"Entering…"_. Never _"Please wait"_.

---

## Empty states

Three lines, three jobs:

1. **What's missing** (one short sentence).
2. **Why it matters** (optional, one sentence).
3. **What to do next** (action — usually a button, sometimes a link).

| Context                         | Copy                                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| Stable, no horses               | _"No horses yet."_ / _"Visit the auction or breed your first foal."_ / `[Browse auction]` |
| Race browser, no eligible races | _"No races match your filters."_ / `[Reset filters]`                                      |
| Auction, all horses sold        | _"Sale complete. Next refresh tomorrow."_                                                 |
| Breeding, no eligible mares     | _"No mares ready to cover."_ / _"A mare must be open and rested."_                        |

**Tone:** factual, never apologetic. Don't say _"Oops, nothing here yet!"_ — say _"No horses yet."_

---

## Errors

Two lines:

1. **What went wrong** (in plain terms).
2. **What to do about it** (one action).

| Bad                        | Good                                                          |
| -------------------------- | ------------------------------------------------------------- |
| _"An error occurred."_     | _"Couldn't save. Check your connection and try again."_       |
| _"You can't do that."_     | _"Not enough cash. You need $4,000."_                         |
| _"Horse is not eligible."_ | _"Stardust can't enter — the race is restricted to fillies."_ |

**Where errors live:**

- Form-level: inline below the input, `text-destructive`.
- Action-level (button click failed): toast via `<Sonner>` (top-right).
- Page-level (route data failed): centred card, with a recovery CTA.

---

## Confirmations (destructive actions)

Format: **State the action + its consequence + the verb again on the button.**

> _"Retire Stardust to stud?"_  
> _"He won't race again."_  
> `[Cancel]` `[Retire Stardust]`

Never use _"Are you sure?"_ on its own. Always restate the consequence so the player can choose with eyes open.

---

## Number formatting

| Type                               | Format                                                                                                | Examples                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Money                              | `$` + `toLocaleString()`. No decimals for cash balances. Two decimals only for unit prices below $10. | `$1,500,000` · `$4.50` per share     |
| Percentages                        | Integer; one decimal only when finer grain matters                                                    | `87%` · `87.4%` (rare)               |
| Race times                         | Two decimals + `s`                                                                                    | `92.41s`                             |
| Split times                        | One decimal + `s`                                                                                     | `23.4s`                              |
| Distances (race)                   | Integer + `m`                                                                                         | `1600m`. Never `1.6km`.              |
| Distances (descriptive)            | Furlongs + `f`                                                                                        | `8f`. Use only in narrative context. |
| Beyer                              | Integer                                                                                               | `102`                                |
| Stat values (Speed, Stamina, etc.) | Integer                                                                                               | `78`                                 |
| Dates                              | `gameCalendarDate(day)` (in-game calendar)                                                            | _"Year 3, Apr 14"_                   |
| Counts                             | Integer with `toLocaleString()` for ≥ 1,000                                                           | `8 horses` · `1,234 wins`            |

**Always pair numbers with `tabular-nums`** when they appear in a column or comparison. See [01-design-system/02-typography.md](../01-design-system/02-typography.md).

---

## Jargon and tooltips

Every racing-jargon term gets a `<Tooltip>` on first appearance per screen. The tooltip body is one tight sentence.

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <span className="underline decoration-dotted decoration-muted-foreground/40">Beyer</span>
  </TooltipTrigger>
  <TooltipContent>A speed figure (0–~120) standardised across distances and tracks.</TooltipContent>
</Tooltip>
```

**Visual treatment:** a dotted underline, `decoration-muted-foreground/40`. Subtle but discoverable. Don't bold or colour the term — the underline does the work.

**Glossary terms** are listed in the [README](../README.md). When adding a new term to the product, add it to the glossary too.

**On the race screen:** tooltips are forbidden during live action (they steal attention). Pre-race and post-race only.

---

## Headlines and titles

| Use                            | Sentence case?           | Example            |
| ------------------------------ | ------------------------ | ------------------ |
| Page title                     | Yes                      | _"My stable"_      |
| Card title                     | Yes                      | _"Today's races"_  |
| Race name                      | Title case (proper noun) | _"Belmont Stakes"_ |
| Section label (tiny uppercase) | UPPERCASE                | _"PURSE"_          |

Title case is reserved for actual names. Everything else is sentence case.

---

## Time / day references

The in-game calendar drives all date copy. Use [gameCalendarDate(day)](../../../src/core/calendar/dateFormatting.ts) for absolute dates (_"Year 3, Apr 14"_) and relative phrasing for upcoming events (_"in 3 days"_, _"tomorrow"_, _"Friday"_).

| Don't                      | Do                                     |
| -------------------------- | -------------------------------------- |
| _"on day 1247"_            | _"Year 3, Apr 14"_                     |
| _"3 ticks from now"_       | _"in 3 days"_                          |
| _"yesterday in real time"_ | _"yesterday in-game"_ if needed (rare) |

---

## Race-screen specific copy

The race screen is the only screen with its own pacing for copy:

| Moment                        | Copy pattern                                   | Example                                      |
| ----------------------------- | ---------------------------------------------- | -------------------------------------------- |
| Pre-race header               | Race name (title case), distance, class, purse | _"Belmont Stakes · 2400m · G1 · $1,500,000"_ |
| Weather indicator             | Emoji + word                                   | _"☀️ Sunny"_, _"🌧️ Rainy"_                   |
| Live leaderboard label (tiny) | UPPERCASE                                      | _"LIVE ORDER"_                               |
| Owned-horse badge             | UPPERCASE in chip                              | _"YOU"_                                      |
| Result overlay title          | Race name                                      | _"Belmont Stakes"_                           |
| Result overlay subtitle       | _"Final result"_                               | (literal)                                    |
| Prize line                    | `+$` + amount                                  | _"+$900,000"_                                |

Race-screen weather emoji is a **controlled exception** to the "no emoji in body copy" rule from [voice-and-tone.md](01-voice-and-tone.md). Each weather has exactly one emoji, used consistently. Never expand to other emoji on this screen.

---

## Open questions

- Should pre-race odds be displayed as percentages or as betting-style fractions (`5/2`)? Currently undecided; track in decision log when implemented.
- How does copy handle the moment a horse is _injured_ mid-race? We don't have that mechanic yet, but we should reserve the tone.
