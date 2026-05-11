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

## Template

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/<ROUTE_PATH>")({
  component: <ComponentName>,
});

function <ComponentName>() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4"><Page Title></h1>
    </div>
  );
}
```

## Steps

1. Derive the route path string from the filename (e.g. `stable.$horseId.tsx` → `/stable/$horseId`)
2. Derive the component name from the route (e.g. `stable.$horseId` → `StableHorseDetail`)
3. Write the file to `src/routes/<filename>.tsx`
4. If the route has a dynamic param (`$param`), show how to access it: `const { param } = Route.useParams()`
5. If it's a nested route (e.g. `stable.$horseId`), check whether a parent layout file `stable.tsx` exists and note if it needs to be created
