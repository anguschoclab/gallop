# Rival Career Milestone Timelines

## Goal
Replace the plain milestone list in the rival career comparison with a compact visual timeline for every selected horse.

## Changes
- Extend each rival milestone record with its best available game-day date, derived from race history for debuts, breakthrough wins, and earnings thresholds, plus career timing for peak transitions and retirement.
- Add a reusable compact timeline component with distinct icons and labels for debut, breakthrough win, earnings, peak transition, and retirement.
- Show milestones chronologically in each horse’s comparison column, preserving the existing distinction between announced and newly reached milestones.
- Keep the timeline readable in the horizontally scrollable comparison table and provide a clear empty state for horses without milestones.
- Add focused tests for milestone dates, ordering, and all five milestone categories.

## Verification
- Run the rival career comparison unit tests and route smoke test.
- Run the project’s structured type check.
- Confirm the preview build reports no errors.
