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

> _"G3 Stakes · 1600m · Turf · Firm"_  
> not  
> _"Tier-3 Big Race, 1 mile, on grass, dry surface"_

### 2. Clear

Short sentences. Active voice. No hedging. If the system isn't sure, _we say so_ — but we say so once, in plain English.

> _"Beyer 102 — projected. Final figure available after the race."_  
> not  
> _"This horse may potentially achieve a Beyer figure of around 102, though this is subject to change."_

### 3. Quietly affectionate

We like horses. We like the players. We don't shout it, but it's there in the corners.

> _"Welcome back. Eight horses, one race today."_  
> not  
> _"Hi! 🐴 Welcome to your stable! 🏇 You have 8 horses!"_

### 4. Never patronising

We never explain a thing twice on the same screen. We never apologise for the player ("Oops! Looks like you're new here!"). We never talk down.

> _"You can't enter this race — the gelding restriction excludes him."_  
> not  
> _"Sorry, looks like this isn't quite the right race for your horse! Try another one!"_

---

## Tone matrix

Tone shifts by **context** (where the user is) and **stakes** (what's at risk).

| Context                        | Tone                             | Example                                                                            |
| ------------------------------ | -------------------------------- | ---------------------------------------------------------------------------------- |
| Idle / dashboard               | Composed, factual                | _"Two races today. Three horses ready to train."_                                  |
| Training                       | Coach-like                       | _"Speed +2. Stamina holding. Energy down to 64%."_                                 |
| Decision moments (enter race?) | Direct, brief                    | _"Enter Stardust in Belmont H — Sat 14:30?"_                                       |
| Pre-race ceremony              | Heightened, broadcast            | _"Belmont Stakes · Grade 1 · $1,500,000."_                                         |
| Mid-race (commentary, future)  | Live, urgent, present-tense      | _"Stardust closing on the leader at the eighth pole."_                             |
| Post-race win                  | Warm, restrained                 | _"Stardust takes the Belmont. +$900,000."_                                         |
| Post-race loss                 | Honest, brief                    | _"Sixth, beaten 4½. He had nothing left at the turn."_                             |
| Errors / blocked actions       | Clear, actionable                | _"Not enough cash. You need $4,000."_                                              |
| Empty states                   | Inviting with racing flavour     | _"No horses yet. Visit the auction or breed your first foal."_                     |
| Confirmations (destructive)    | Plain, with consequence          | _"Retire Stardust to stud? He won't race again."_                                  |
| Tooltips (jargon glossary)     | Encyclopedia-tight, one sentence | _"Beyer figure: a speed score (0–~120) standardised across distances and tracks."_ |

---

## What we never write

- **"Oops!"** or **"Whoops!"** — childish.
- **"Click here"** — never. Link the noun: _"View this horse"_, _"Enter this race"_.
- **Exclamation marks** — almost never. A win can be celebrated without one.
- **All-caps for emphasis** — uppercase is reserved for tiny labels (_"PURSE"_, _"BEYER"_), not emphasis.
- **Emoji in body copy** — only in narrow controlled contexts (race-screen weather indicator, see [02-ux-copy-patterns.md](02-ux-copy-patterns.md)).
- **Second-person preachy** — _"You should..."_, _"Make sure to..."_. We respect the player's autonomy.

---

## Pronouns and how we refer to the player

- **The player** is "you" in second person. Never "the user", never "the manager".
- **The stable** is "your stable", but the trainer-character (if we ever introduce one) is implied, not voiced.
- **Horses** are referred to by name in copy. Pronouns: "him" / "her" — we know each horse's sex. Use _"it"_ only for the general case ("a horse needs at least three days' rest").

---

## Tense

Default to **present tense**. Past tense for results, future for upcoming.

> _"Stardust runs in race 3."_  
> _"Stardust won the Belmont yesterday."_  
> _"Stardust will run on Saturday."_

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
- How much regional flavour (UK _"colt"_ vs US _"gelding"_ phrasings)? Currently US-default. Revisit when calendars span more regions.
