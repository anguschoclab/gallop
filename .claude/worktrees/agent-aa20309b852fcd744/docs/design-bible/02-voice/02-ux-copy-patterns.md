---
name: UX copy patterns
description: Concrete patterns for buttons, errors, empty states, numbers, and jargon
type: voice
status: Stable
owns: design:ux-copy
---

# UX copy patterns

Voice is the high-level mood; this is the working manual. Copy across Gallop should follow these patterns *to the letter*.

---

## Buttons

Format: **Verb + (object)**. Always sentence-case. No periods.

| Good | Bad |
|---|---|
| *Train Stardust* | *Click to train* |
| *Enter race* | *Submit* |
| *Confirm bid* | *OK* |
| *Retire to stud* | *Continue* (where 'continue' is doing the action) |
| *Advance day* | *Next* |
| *Watch live* | *Go to race* |

**Primary CTA** uses `<Button>` (default variant) and is **the only one** at default emphasis on the screen. Everything else is `secondary`, `ghost`, or `outline`.

**Destructive CTAs** use `<Button variant="destructive">` and the verb names the destruction: *"Sell Stardust"*, *"Scratch from race"*, *"Delete save"*.

**Loading state** changes the verb to its progressive form: *"Training…"*, *"Entering…"*. Never *"Please wait"*.

---

## Empty states

Three lines, three jobs:
1. **What's missing** (one short sentence).
2. **Why it matters** (optional, one sentence).
3. **What to do next** (action — usually a button, sometimes a link).

| Context | Copy |
|---|---|
| Stable, no horses | *"No horses yet."* / *"Visit the auction or breed your first foal."* / `[Browse auction]` |
| Race browser, no eligible races | *"No races match your filters."* / `[Reset filters]` |
| Auction, all horses sold | *"Sale complete. Next refresh tomorrow."* |
| Breeding, no eligible mares | *"No mares ready to cover."* / *"A mare must be open and rested."* |

**Tone:** factual, never apologetic. Don't say *"Oops, nothing here yet!"* — say *"No horses yet."*

---

## Errors

Two lines:
1. **What went wrong** (in plain terms).
2. **What to do about it** (one action).

| Bad | Good |
|---|---|
| *"An error occurred."* | *"Couldn't save. Check your connection and try again."* |
| *"You can't do that."* | *"Not enough cash. You need $4,000."* |
| *"Horse is not eligible."* | *"Stardust can't enter — the race is restricted to fillies."* |

**Where errors live:**
- Form-level: inline below the input, `text-destructive`.
- Action-level (button click failed): toast via `<Sonner>` (top-right).
- Page-level (route data failed): centred card, with a recovery CTA.

---

## Confirmations (destructive actions)

Format: **State the action + its consequence + the verb again on the button.**

> *"Retire Stardust to stud?"*  
> *"He won't race again."*  
> `[Cancel]` `[Retire Stardust]`

Never use *"Are you sure?"* on its own. Always restate the consequence so the player can choose with eyes open.

---

## Number formatting

| Type | Format | Examples |
|---|---|---|
| Money | `$` + `toLocaleString()`. No decimals for cash balances. Two decimals only for unit prices below $10. | `$1,500,000` · `$4.50` per share |
| Percentages | Integer; one decimal only when finer grain matters | `87%` · `87.4%` (rare) |
| Race times | Two decimals + `s` | `92.41s` |
| Split times | One decimal + `s` | `23.4s` |
| Distances (race) | Integer + `m` | `1600m`. Never `1.6km`. |
| Distances (descriptive) | Furlongs + `f` | `8f`. Use only in narrative context. |
| Beyer | Integer | `102` |
| Stat values (Speed, Stamina, etc.) | Integer | `78` |
| Dates | `gameCalendarDate(day)` (in-game calendar) | *"Year 3, Apr 14"* |
| Counts | Integer with `toLocaleString()` for ≥ 1,000 | `8 horses` · `1,234 wins` |

**Always pair numbers with `tabular-nums`** when they appear in a column or comparison. See [01-design-system/02-typography.md](../01-design-system/02-typography.md).

---

## Jargon and tooltips

Every racing-jargon term gets a `<Tooltip>` on first appearance per screen. The tooltip body is one tight sentence.

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <span className="underline decoration-dotted decoration-muted-foreground/40">Beyer</span>
  </TooltipTrigger>
  <TooltipContent>
    A speed figure (0–~120) standardised across distances and tracks.
  </TooltipContent>
</Tooltip>
```

**Visual treatment:** a dotted underline, `decoration-muted-foreground/40`. Subtle but discoverable. Don't bold or colour the term — the underline does the work.

**Glossary terms** are listed in the [README](../README.md). When adding a new term to the product, add it to the glossary too.

**On the race screen:** tooltips are forbidden during live action (they steal attention). Pre-race and post-race only.

---

## Headlines and titles

| Use | Sentence case? | Example |
|---|---|---|
| Page title | Yes | *"My stable"* |
| Card title | Yes | *"Today's races"* |
| Race name | Title case (proper noun) | *"Belmont Stakes"* |
| Section label (tiny uppercase) | UPPERCASE | *"PURSE"* |

Title case is reserved for actual names. Everything else is sentence case.

---

## Time / day references

The in-game calendar drives all date copy. Use [gameCalendarDate(day)](../../../src/core/calendar/dateFormatting.ts) for absolute dates (*"Year 3, Apr 14"*) and relative phrasing for upcoming events (*"in 3 days"*, *"tomorrow"*, *"Friday"*).

| Don't | Do |
|---|---|
| *"on day 1247"* | *"Year 3, Apr 14"* |
| *"3 ticks from now"* | *"in 3 days"* |
| *"yesterday in real time"* | *"yesterday in-game"* if needed (rare) |

---

## Race-screen specific copy

The race screen is the only screen with its own pacing for copy:

| Moment | Copy pattern | Example |
|---|---|---|
| Pre-race header | Race name (title case), distance, class, purse | *"Belmont Stakes · 2400m · G1 · $1,500,000"* |
| Weather indicator | Emoji + word | *"☀️ Sunny"*, *"🌧️ Rainy"* |
| Live leaderboard label (tiny) | UPPERCASE | *"LIVE ORDER"* |
| Owned-horse badge | UPPERCASE in chip | *"YOU"* |
| Result overlay title | Race name | *"Belmont Stakes"* |
| Result overlay subtitle | *"Final result"* | (literal) |
| Prize line | `+$` + amount | *"+$900,000"* |

Race-screen weather emoji is a **controlled exception** to the "no emoji in body copy" rule from [voice-and-tone.md](01-voice-and-tone.md). Each weather has exactly one emoji, used consistently. Never expand to other emoji on this screen.

---

## Open questions

- Should pre-race odds be displayed as percentages or as betting-style fractions (`5/2`)? Currently undecided; track in decision log when implemented.
- How does copy handle the moment a horse is *injured* mid-race? We don't have that mechanic yet, but we should reserve the tone.
