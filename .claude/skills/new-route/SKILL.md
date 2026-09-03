---
name: new-route
description: Scaffold a new TanStack Start file-based route in src/routes/. Accepts a route path argument (e.g. "stable.$horseId" or "auction.index"). Creates the route file with correct boilerplate.
---

Create a new TanStack Start route file in `src/routes/` for the route path provided by the user.

## Rules

- Route filename follows TanStack Router file-based conventions: dots = nested segments, `$param` = dynamic param, `.index` = index route
- Always export `Route` using `createFileRoute` with the correct path string derived from the filename
- Use `useGame` from `@/game/store` if the route needs game state
- Import UI primitives from `@/components/ui/` (Card, Button, Badge, etc.)
- Use `lucide-react` for icons
- Component name should be PascalCase derived from the route name

## Template — lazy component (preferred for non-trivial routes)

For routes with a dedicated component file under `src/components/routes/`, use `lazyRouteComponent` so the component is code-split:

```tsx
import { createFileRoute, lazyRouteComponent, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/<ROUTE_PATH>")({
  component: lazyRouteComponent(() => import("@/components/routes/<ComponentName>")),
  notFoundComponent: () => (
    <div className="p-12 text-center space-y-4">
      <h1 className="text-4xl font-black font-[family-name:var(--font-display)] text-cream">
        Not found
      </h1>
      <Link to="/<PARENT>" className="text-sm text-cream-muted hover:text-gold">
        Back
      </Link>
    </div>
  ),
});
```

The component file at `src/components/routes/<ComponentName>.tsx` accesses params via `getRouteApi`:

```tsx
import { getRouteApi } from "@tanstack/react-router";

const { useParams } = getRouteApi("/<ROUTE_PATH>");

export function <ComponentName>() {
  const { <param> } = useParams();
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Page Title</h1>
    </div>
  );
}
```

## Template — inline component (for simple routes)

For routes with minimal logic that don't warrant a separate component file:

```tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/<ROUTE_PATH>")({
  component: <ComponentName>,
});

function <ComponentName>() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Page Title</h1>
    </div>
  );
}
```

## Steps

1. Derive the route path string from the filename (e.g. `stable.$horseId.tsx` → `/stable/$horseId`)
2. Derive the component name from the route (e.g. `stable.$horseId` → `StableHorseDetail`)
3. If the route is non-trivial (has params, needs data fetching, will have substantial UI), use the lazy component template and create the component file under `src/components/routes/`
4. If the route is simple (static page, minimal logic), use the inline template
5. Write the route file to `src/routes/<filename>.tsx`
6. If the route has a dynamic param (`$param`), use `getRouteApi("/<ROUTE_PATH>").useParams()` in the component file (not `Route.useParams()` in the route file — that only works with inline components)
7. If it's a nested route (e.g. `stable.$horseId`), check whether a parent layout file `stable.tsx` exists and note if it needs to be created
8. After creating the route, run `bun run build` to regenerate `routeTree.gen.ts`
