## 2024-05-18 - Removed TanStack Router Link loose typings

**Learning:** When using TanStack Router's `<Link>` component with generic helper functions to return path configurations (`{ to, params }`), it drops strict path typing unless correctly constrained. This causes developers to fall back to `as any` casts to satisfy `<Link to={... as any}>`.

**Action:** Render standard `<Link>` components conditionally per route directly with string literals and strict generic param objects rather than extracting route building logic into opaque object-returning functions.
