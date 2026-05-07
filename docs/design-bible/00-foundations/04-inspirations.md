---
name: Inspirations
description: Annotated cues from peer games — what we steal, what we don't
type: foundation
status: Stable
owns: design:research-synthesis
---

# Inspirations

Gallop sits in a rare crossing of genres: management sim depth meets live-race spectacle. Each peer below has solved part of the problem. We borrow the parts that fit our mantra and leave the rest behind.

> The pattern for each entry: **What we steal · What we don't · Why**

---

## _Starters Orders_ (4 / 7) — Strategic Designs

The reigning king of UK racing sims. Deep stable management, 30+ track scheduling, real owner economics.

**Steal.**

- **Race calendar density.** Their week-view shows dozens of races without overwhelming. Adopted in our regional [calendars](../05-screens/08-calendars-and-schedule.md).
- **Race-card scrutiny.** Every entry shows form, weight, jockey, draw — at a glance. Our `RaceDetailPanel` echoes the row structure.
- **Honest uncertainty.** They show probability bands rather than a single number for upcoming races. We do the same with projected Beyer.

**Don't steal.**

- **Spreadsheet aesthetic.** Their UI is dense to the point of intimidation. We owe Alex (the Tourist) more.
- **Modal-heavy navigation.** Three modals deep is normal there; it's never normal here.

**Why.** Their depth is unmatched, but their UI hasn't kept pace with modern web idioms. We can take the data model, leave the chrome.

---

## _Photo Finish: Horse Racing_ — Third Time Games

Beautiful 3D race rendering, mobile-first, focused on the visceral payoff. Strong silk treatment, weather feel, broadcast-style HUD.

**Steal.**

- **Silk-as-identity.** Their silks are the horse's brand on every screen. We follow suit — silk dot beside every name.
- **Weather as atmosphere.** Sunset, rain, night change the mood without changing the rules. Our [theming](../01-design-system/05-theming.md) takes this seriously.
- **HUD restraint during the race.** Minimal chrome, primary information only.

**Don't steal.**

- **Mobile-first density.** They optimise for thumbs, we optimise for desktop scanning.
- **Microtransaction pressure.** Their screens are subtly tilted toward purchase prompts. Ours never will be.

**Why.** They've nailed the emotional climax. We owe the same pulse on race day, applied to a deeper sim.

---

## _Pocket Card Jockey_ — Game Freak

Tiny, joyful, brilliant. The opposite of _Starters Orders_: simplicity as a virtue.

**Steal.**

- **One verb per screen.** Train. Race. Breed. Each feels obvious. We adopted this as principle 5.
- **Animation as feedback.** A horse pricking up its ears tells you something the UI didn't say in words. We use motion the same way (race horse pulse, training stat-tick).
- **Tone — affectionate, never cynical.** Our voice (see [02-voice/](../02-voice/)) borrows this directly.

**Don't steal.**

- **Card mechanic.** Solitaire-as-racing is great, but it's not our game.
- **Cuteness.** Photo Finish's broadcast feel is closer to our target than Card Jockey's chibi style.

**Why.** Card Jockey proves you can simplify radically without dumbing down. Maya can still find depth; Alex can still find a way in.

---

## _Football Manager_ (Sports Interactive)

The yardstick for management sims. Touchline tactics, scout reports, transfer windows, news inbox.

**Steal.**

- **Inbox / news pattern.** Daily-recap style updates. We use this on the [Recap screen](../05-screens/09-recap.md).
- **Comparison view.** Side-by-side player stats. We have the same on `HorseCompare`.
- **Scout fog-of-war.** Some attributes are uncertain until observed. We use the same for foal stats and rival horses.
- **Continue button.** A single, confident "advance time" affordance. Our `Advance Day` button is its descendant.

**Don't steal.**

- **Interface complexity.** FM's UI has 25+ years of accretion. We start fresh.
- **Skin variability.** They support hundreds of community skins; we ship one design system.

**Why.** FM has solved problems we are about to encounter. We harvest patterns, not pixels.

---

## _Out of the Park Baseball_ — OOTP

The other gold standard for stat-rich sport sims.

**Steal.**

- **Career-long charts.** Multi-season trend lines for an athlete. Our `BeyerChart` and `GradedStatsChart` follow the model.
- **Transactions log.** Public history of who-bought-what. Auction history view should follow.

**Don't steal.**

- **DOS-era table chrome.** Borders on borders. We're calmer than that.

**Why.** Long careers deserve long memory. OOTP shows how to display 20 years of data without losing the eye.

---

## Adjacent inspirations (smaller borrows)

| Source                                              | What we take                                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Linear (the project tool)**                       | Speed of input, command-K palette, minimal chrome. Inspires our keyboard-shortcut layer.   |
| **Stripe Dashboard**                                | Number formatting (currency, percentages, abbreviations), tabular numerics, restraint.     |
| **Bloomberg terminal**                              | Density that respects the user's expertise. Used carefully — we're not a terminal.         |
| **TBA broadcast graphics (TVG, Sky Sports Racing)** | Lower-third overlays, finish-line moments. Direct ancestor of our race-screen leaderboard. |

---

## What we are deliberately not

- **Not a mobile-first idle game.** No tap-to-collect, no timer skips.
- **Not a tycoon game.** Money matters, but it's not the headline. Glory is.
- **Not a platform.** No mod tools, no community marketplace. We ship a finished thing.

---

## Open questions

- Is there an Asian-market sim peer (e.g. _Derby Stallion_) we should add? It's culturally important to the genre but the team isn't fluent in its UX yet.
- Should we study the broadcast graphics of a specific sport (NASCAR? Formula 1?) for HUD inspiration on the race screen?
