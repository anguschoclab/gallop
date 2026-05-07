---
name: Voice and tone
description: How Gallop sounds — voice attributes, tone matrix by context
type: voice
status: Stable
owns: design:ux-copy
---

# Voice and tone

**Voice** is constant. **Tone** shifts with context.

Gallop's voice is **knowledgeable, clear, quietly affectionate, never patronising**. We're a knowledgeable trainer at the rail — happy to explain Beyer figures to the newcomer, but not slowing down to translate every term into baby-talk.

---

## Voice — the four attributes

### 1. Knowledgeable

We use the real terminology. Beyer, dosage, graded, furlong, broodmare, claim, scratch. We don't dilute these terms because we trust the player to pick them up — the tooltip layer carries the load.

> *"G3 Stakes · 1600m · Turf · Firm"*  
> not  
> *"Tier-3 Big Race, 1 mile, on grass, dry surface"*

### 2. Clear

Short sentences. Active voice. No hedging. If the system isn't sure, *we say so* — but we say so once, in plain English.

> *"Beyer 102 — projected. Final figure available after the race."*  
> not  
> *"This horse may potentially achieve a Beyer figure of around 102, though this is subject to change."*

### 3. Quietly affectionate

We like horses. We like the players. We don't shout it, but it's there in the corners.

> *"Welcome back. Eight horses, one race today."*  
> not  
> *"Hi! 🐴 Welcome to your stable! 🏇 You have 8 horses!"*

### 4. Never patronising

We never explain a thing twice on the same screen. We never apologise for the player ("Oops! Looks like you're new here!"). We never talk down.

> *"You can't enter this race — the gelding restriction excludes him."*  
> not  
> *"Sorry, looks like this isn't quite the right race for your horse! Try another one!"*

---

## Tone matrix

Tone shifts by **context** (where the user is) and **stakes** (what's at risk).

| Context | Tone | Example |
|---|---|---|
| Idle / dashboard | Composed, factual | *"Two races today. Three horses ready to train."* |
| Training | Coach-like | *"Speed +2. Stamina holding. Energy down to 64%."* |
| Decision moments (enter race?) | Direct, brief | *"Enter Stardust in Belmont H — Sat 14:30?"* |
| Pre-race ceremony | Heightened, broadcast | *"Belmont Stakes · Grade 1 · $1,500,000."* |
| Mid-race (commentary, future) | Live, urgent, present-tense | *"Stardust closing on the leader at the eighth pole."* |
| Post-race win | Warm, restrained | *"Stardust takes the Belmont. +$900,000."* |
| Post-race loss | Honest, brief | *"Sixth, beaten 4½. He had nothing left at the turn."* |
| Errors / blocked actions | Clear, actionable | *"Not enough cash. You need $4,000."* |
| Empty states | Inviting with racing flavour | *"No horses yet. Visit the auction or breed your first foal."* |
| Confirmations (destructive) | Plain, with consequence | *"Retire Stardust to stud? He won't race again."* |
| Tooltips (jargon glossary) | Encyclopedia-tight, one sentence | *"Beyer figure: a speed score (0–~120) standardised across distances and tracks."* |

---

## What we never write

- **"Oops!"** or **"Whoops!"** — childish.
- **"Click here"** — never. Link the noun: *"View this horse"*, *"Enter this race"*.
- **Exclamation marks** — almost never. A win can be celebrated without one.
- **All-caps for emphasis** — uppercase is reserved for tiny labels (*"PURSE"*, *"BEYER"*), not emphasis.
- **Emoji in body copy** — only in narrow controlled contexts (race-screen weather indicator, see [02-ux-copy-patterns.md](02-ux-copy-patterns.md)).
- **Second-person preachy** — *"You should..."*, *"Make sure to..."*. We respect the player's autonomy.

---

## Pronouns and how we refer to the player

- **The player** is "you" in second person. Never "the user", never "the manager".
- **The stable** is "your stable", but the trainer-character (if we ever introduce one) is implied, not voiced.
- **Horses** are referred to by name in copy. Pronouns: "him" / "her" — we know each horse's sex. Use *"it"* only for the general case ("a horse needs at least three days' rest").

---

## Tense

Default to **present tense**. Past tense for results, future for upcoming.

> *"Stardust runs in race 3."*  
> *"Stardust won the Belmont yesterday."*  
> *"Stardust will run on Saturday."*

---

## How to apply tone

Before writing any copy, ask:
1. **Where is the player?** (Dashboard, race screen, modal?)
2. **What are the stakes?** (Idle, deciding, watching, reacting?)
3. **Are they doing one of the three personas' jobs?** (Optimising, building a dynasty, watching the spectacle?)

Then check the matrix above. When in doubt: shorter, plainer, more honest.

For specific copy patterns (buttons, errors, empty states, number formatting), see [02-ux-copy-patterns.md](02-ux-copy-patterns.md).

---

## Open questions

- Should we develop a named "trainer" voice for race recap commentary, or keep it omniscient/neutral?
- How much regional flavour (UK *"colt"* vs US *"gelding"* phrasings)? Currently US-default. Revisit when calendars span more regions.
