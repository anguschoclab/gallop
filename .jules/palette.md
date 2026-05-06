## 2024-05-05 - Added ARIA Labels to Jockey Management Components
**Learning:** Found multiple instances where Shadcn/ui dropdowns (`<select>`) and icon-only `<button>`s lacked `aria-label`s within the application components (specifically `JockeyRoster.tsx` and `JockeyCard.tsx`). While basic HTML elements are accessible on their own, explicit labels are missing when used for icon-only interactions.
**Action:** When working on complex Shadcn/ui or form-heavy screens, always verify that `select`, `Input` and icon-only `button` elements have clear, descriptive `aria-label`s.
