# Track History Filters

## Build
- Add one compact filter row to Course Histories with an in-game day range, race type, and stable selector.
- Filter the selected course's race list using all three controls together.
- Recalculate the displayed prestige movement from the same filtered races; when a stable is selected, show only that stable's movement.
- Show a clear empty result and provide a one-click reset.

## Technical details
- Add reusable ledger filtering and stable-option helpers in the history module.
- Keep game-day values as numbers rather than real-world dates because the ledger uses the game's calendar.
- Add focused tests for combined date, race-type, and stable filtering.
- Verify the focused tests, type checks, preview build, and the page at desktop and mobile widths.
