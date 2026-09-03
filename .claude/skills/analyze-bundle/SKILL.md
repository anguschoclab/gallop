---
name: analyze-bundle
description: Analyzes bundle size and composition
disable-model-invocation: true
---

Analyze bundle size and composition to identify optimization opportunities.

## Step 1 — Build for production

```bash
cd "/Users/amauricia/Documents/GitHub/gallop" && bun run build
```

This produces the production build in `.output/` and `dist/`. Vite prints chunk sizes during the build.

## Step 2 — Inspect chunk sizes

After the build, list the largest output assets:

```bash
ls -lhS dist/assets/*.js 2>/dev/null | head -20
ls -lhS .output/public/_build/*.js 2>/dev/null | head -20
```

Look for:
- Chunks larger than ~500KB (candidates for code splitting)
- Duplicate dependencies bundled into multiple chunks
- Large vendor chunks that could be tree-shaken

## Step 3 — Visualize (optional)

For a full treemap visualization of the bundle:

```bash
bunx vite-bundle-visualizer --output-format html --filename bundle-report.html
```

This generates `bundle-report.html` showing every module's contribution to the bundle, colored by source package. Open it in a browser to identify large dependencies and dead code.

## Step 4 — Act on findings

- **Large route components**: ensure routes use `lazyRouteComponent` (see the `new-route` skill) so they're code-split
- **Heavy dependencies**: check if they're tree-shakeable or if a lighter alternative exists
- **Duplicate code**: check for multiple versions of the same package in `node_modules`
- **Dead code**: run the dead-code scan (see `audit/02-deadcode.md` for the methodology used in the last sweep)
