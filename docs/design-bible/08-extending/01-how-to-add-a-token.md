---
name: How to add a token
description: Step-by-step — adding a new colour, radius, or spacing token
type: extending
status: Stable
owns: design:design-system
---

# How to add a token

Tokens are the system's smallest unit. Adding one is the lightest extension you can make — but it touches three places, in order. Skip a step and the token won't reach the components.

---

## Before you add a token, ask

1. **Does an existing token already cover this?** Re-check [01-design-system/01-tokens.md](../01-design-system/01-tokens.md). 90% of "I need a new colour" turns into "I should use `accent` here".
2. **Is this a primitive or a semantic?** Primitives are raw values; semantics are roles. We add semantics; primitives are values inside them.
3. **Does it belong to a theme?** A token used only on the race screen probably belongs to the _broadcast_ theme, not the global palette.

If the new token still seems necessary, follow the steps below.

---

## The three steps

### Step 1 — Add primitive values

Edit [src/styles.css](../../../src/styles.css). Add the variable to **both** `:root` (light) and `.dark` (dark) blocks. Use OKLCH for colours; no hex.

```css
:root {
  /* ...existing... */
  --info: oklch(0.55 0.15 235);
  --info-foreground: oklch(0.99 0.005 100);
}

.dark {
  /* ...existing... */
  --info: oklch(0.7 0.18 235);
  --info-foreground: oklch(0.129 0.042 264.695);
}
```

If the token is theme-specific (e.g. `broadcast-track`), define it under that theme's selector (`.broadcast { ... }`).

### Step 2 — Register in `@theme inline`

In the same file, add to the `@theme inline { ... }` block so Tailwind exposes utilities:

```css
@theme inline {
  /* ...existing... */
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
}
```

This is what makes `bg-info`, `text-info-foreground`, `border-info` available.

### Step 3 — Document and use

1. Add the token to the table in [01-design-system/01-tokens.md](../01-design-system/01-tokens.md). One row, one sentence on its role.
2. Use it via Tailwind utilities: `bg-info`, `text-info-foreground`. Never reference the CSS variable directly in components.
3. If the token introduces a new pattern (e.g. an "info" badge variant), document the pattern in [03-components/](../03-components/) too.

---

## Spacing tokens

Spacing is mostly the Tailwind default scale. We don't add new general-purpose spacing.

**Exception**: race-screen-specific units (lane height, sidebar width). These get tokens for tokenisation's sake (G2 in [05-screens/04-race-viewer.md](../05-screens/04-race-viewer.md)):

```css
@theme inline {
  --race-lane-height: 2.25rem;
  --race-sidebar-width: 17.5rem;
}
```

Used as `h-[var(--race-lane-height)]` or via custom Tailwind utilities once defined.

---

## Radius tokens

We have `radius-sm` through `radius-4xl` ([01-tokens.md](../01-design-system/01-tokens.md)). Adding a new radius value is rare.

If you need one:

1. Decide whether it's a tweak to the base (`--radius`) or an additional step.
2. If a tweak: change `--radius` in `:root`. Every other radius rebases automatically.
3. If a step: add `--radius-${name}: calc(var(--radius) + Xpx)` in `@theme inline`.
4. Document it.

---

## Anti-patterns

- **Don't** add a token for a one-off case. If only one component uses it, it's not a token — it's a magic number, and the magic number should be deleted (use an existing token).
- **Don't** add a primitive value without registering its semantic name. A primitive without a role isn't accessible to components.
- **Don't** name tokens by their value (`--blue-500`). Name them by their role (`--info`, `--accent`).
- **Don't** add light/dark values that aren't perceptually balanced. OKLCH gives you the tools — use them.

---

## Naming conventions

| Pattern           | Example                                      |
| ----------------- | -------------------------------------------- |
| Role only         | `--primary`, `--muted`, `--destructive`      |
| Role + variant    | `--primary-foreground`, `--muted-foreground` |
| Family + role     | `--sidebar-primary`, `--sidebar-accent`      |
| Theme + role      | `--broadcast-track`, `--broadcast-rail`      |
| Domain + property | `--race-lane-height`, `--race-sidebar-width` |

Avoid:

- Numeric scales (`--blue-100` … `--blue-900`).
- Vague semantics (`--colour1`, `--bg2`).
- Mixed languages (`--couleur-fond`).

---

## Open questions

- Should we adopt a tokens.json source-of-truth (Figma → CSS) when we have a Figma file? Track in decision log.
- Do we want a _brand_ family of tokens (`--brand-pop`, `--brand-quiet`) for the rare moments we want a clearly Gallop-specific colour, distinct from generic _primary_?
