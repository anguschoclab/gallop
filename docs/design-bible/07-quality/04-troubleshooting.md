# Troubleshooting & Maintenance

Status: Stable (v0.1)

This guide covers common development issues and maintenance tasks to keep the Gallop codebase clean and functional.

---

## Fixing Stray JS Artifacts

Sometimes, build artifacts (`.js` files) can accidentally be generated in the `src/` directory. These files can cause conflicts with Vite's module resolution, as they might shadow their `.ts` or `.tsx` counterparts.

### Symptoms

- Changes in `.ts` files aren't reflecting in the browser.
- Unexpected "duplicate module" errors.
- Linting errors related to `.js` files in `src/`.

### Resolution

To safely delete stray artifacts and re-run the build:

1. **Delete stray JS files:**
   Run this command from the project root to remove all `.js` files in `src/` except for those in `src/assets/` (which are intentional).

   ```bash
   find src -name "*.js" -not -path "src/assets/*" -delete
   ```

2. **Verify cleanup:**
   Use the project's helper script to ensure no stray files remain:

   ```bash
   bun run check:no-stray-js
   ```

3. **Re-run the build:**
   ```bash
   bun run build
   ```

---

## Common Build Errors

### Type Errors in `src/routeTree.gen.ts`

If you see errors related to the route tree, try regenerating it:

```bash
# The route tree is normally generated automatically by the TanStack Router plugin
# during dev or build, but you can force it by restarting the dev server.
```

### Worker Initialization Failures

Ensure your browser supports ES modules in Workers. Gallop uses `type: "module"` for its engine and storage workers.
