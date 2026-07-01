# Preview runtime verification — the headless recipe

Driving the Gallop preview to confirm a page renders. These are hard-won gotchas; ignoring them produces false negatives (a working fix that looks broken) or dead ends (a game you can't get into).

Use the `preview_*` tools (mcp**Claude_Preview**\*). Never use Bash for the dev server.

## 0. Start the server

```
preview_start  name: "gallop"     # matches .claude/launch.json (bun run dev, port 8080)
```

You'll get a `serverId` — pass it to every later `preview_*` call.

## 1. Getting into a game (the OPFS problem)

The app boots to `/start`. With no save it shows "Welcome to the paddock" and you must create one. **Critical:** this preview browser has **no OPFS**, so the real game save is in-memory only. A _hard_ navigation (`location.assign`, `location.reload`, full reload) **loses the save** and bounces you back to `/start`. Two consequences:

- **Onboard once, then never hard-reload.** Navigate with SPA (client-side) clicks afterward — state survives those, not full reloads.
- If a page shows `/start` unexpectedly mid-verification, you didn't hit a bug — you lost the save with a hard nav. Re-onboard.

### Onboarding the new-game wizard headlessly

The wizard is 4 steps: **Stable identity → Silks → Backstory → Review & Begin**. Backstory selection gates the "Continue"/"Begin" button (it's disabled until a card is picked). Drive it with `preview_eval`. React-controlled inputs need the native value setter, not `el.value =`:

```js
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const setVal = (el, v) => {
    const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    d.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };
  // From /start: enter the wizard
  Array.from(document.querySelectorAll("a,button"))
    .find((b) => /Begin Your Stable/i.test(b.textContent))
    ?.click();
  await sleep(600);
  // Step 1: identity
  const inputs = document.querySelectorAll("input");
  if (inputs[0]) setVal(inputs[0], "Verify Stables");
  if (inputs[1]) setVal(inputs[1], "QA");
  Array.from(document.querySelectorAll("button"))
    .find((b) => /^Continue/i.test(b.textContent.trim()) && !b.disabled)
    ?.click();
  await sleep(800);
  // Step 2: silks — just continue
  Array.from(document.querySelectorAll("button"))
    .find((b) => /^Continue/i.test(b.textContent.trim()) && !b.disabled)
    ?.click();
  await sleep(800);
  // Step 3: backstory — pick "The Inheritor" (4 horses, easiest to test with). REQUIRED before Continue enables.
  Array.from(document.querySelectorAll('[role="button"],button,div'))
    .find((b) => /great-aunt left you/i.test(b.textContent) && b.textContent.length < 400)
    ?.click();
  await sleep(400);
  Array.from(document.querySelectorAll("button"))
    .find((b) => /^Continue/i.test(b.textContent.trim()) && !b.disabled)
    ?.click();
  await sleep(800);
  // Step 4: review → Begin
  Array.from(document.querySelectorAll("button"))
    .find((b) => /^Begin/i.test(b.textContent.trim()) && !b.disabled)
    ?.click();
  await sleep(1800);
  return { at: location.pathname, hasGame: /Command Center/.test(document.body.innerText) };
})();
```

Expected end state: `{ at: "/", hasGame: true }`. If it ends at `/start`, a step's button was disabled (usually backstory not selected) — re-run and check `continueDisabled` per step. The wizard's exact steps can change; if the script stalls, snapshot the page (`buttons`, `inputs`, `heading`) and adapt.

## 2. The live error counter (verifying "no loop")

`preview_console_logs` returns an **accumulated, session-long buffer** that `location.assign` does **not** clear. After fixing a loop you'll still see the _old_ crash spam in it and wrongly conclude the fix failed. Instead, count only errors generated _after_ you start watching:

```js
// Install once (survives SPA navigation; skip re-patching).
(() => {
  window.__errs = [];
  if (!console.error.__p) {
    const o = console.error;
    console.error = function (...a) {
      window.__errs.push(String(a[0]).slice(0, 90));
      return o.apply(this, a);
    };
    console.error.__p = true;
  }
  return "counter installed";
})();
```

Then: reset `window.__errs = []`, perform an **SPA navigation** that remounts the target (see §3), and read:

```js
(() => ({
  at: location.pathname + location.search,
  liveErrors: (window.__errs || []).length,
  loopErrors: (window.__errs || []).filter((e) => /getSnapshot|update depth/i.test(e)).length,
  errorBoundary: /Try again|Something went wrong/i.test(document.body.innerText),
}))();
```

`loopErrors: 0` and `errorBoundary: false` with the expected content present = genuinely clean. To prove the counter _works_, you can reintroduce the bug, navigate, and confirm it counts > 0 — then restore.

## 3. SPA navigation (don't hard-nav)

To remount a route while preserving the in-memory save, click an existing in-app `<Link>` (TanStack intercepts same-origin anchor clicks):

```js
// Navigate by clicking a sidebar/route link already in the DOM:
Array.from(document.querySelectorAll("a"))
  .find((a) => (a.getAttribute("href") || "").startsWith("/racing"))
  ?.click();
```

If no link to your target exists in the DOM, create and click one — TanStack still intercepts it (this is a full-client nav only if the router misses it; for in-app routes it stays SPA):

```js
const a = document.createElement("a");
a.href = "/race/" + id;
document.body.appendChild(a);
a.click();
```

## 4. Radix tabs ignore synthetic `.click()`

Radix `TabsTrigger`/`Tabs` (used by every hub: Honors, Racing, Briefing, Breeding) do **not** switch on a plain `el.click()` — they need real pointer events. So a synthetic click on a tab won't flip the panel, and you'll wrongly think tab-switching is broken.

- To verify a hub _renders its tabs_, that's enough: count `[role="tab"]` and check `errorBoundary`/`liveErrors`.
- To verify _deep-linking_ (the real contract of the `useTabParam` pattern), navigate to the URL form instead: e.g. confirm `/awards` redirects to `/honors?tab=awards` and the Awards tab is `data-state="active"`. The URL→active-tab path is what matters and is testable without fighting Radix.

## 5. Extracting an entity ID via React fiber

Many pages need an ID you can't get from the URL (a race, horse, stable). Pull it off a rendered element's React fiber rather than hunting the DOM:

```js
(() => {
  const el = document.querySelector('[role="dialog"]') || document.body;
  const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
  let f = el[key],
    hops = 0;
  while (f && hops < 200) {
    const p = f.memoizedProps;
    if (p?.race?.id) return p.race.id;
    if (p?.raceId) return p.raceId;
    f = f.return;
    hops++;
  }
  return null;
})();
```

Adapt the prop check (`p?.horse?.id`, `p?.stableId`, etc.) to the entity you need. Horse IDs are also easy to scrape from dashboard links: `a[href^="/stable/"]`.

## 6. Reading content without false negatives (the uppercase trap)

Headings here are often CSS `text-transform: uppercase`. `document.body.innerText` returns the **rendered** (uppercased) text, so a mixed-case match like `/Genetics/` fails even though the section is there. Match against `element.textContent` (case-preserved) for headings, or make your regex case-insensitive. When a presence check surprises you, re-check with `textContent` before concluding something is missing.

## 7. When a long-running animation won't finish

The live race sim runs slowly in preview and synthetic speed-control clicks (`4x`) often don't engage. If you're verifying an end state behind a long animation and can't reach it, that's an environment limit — don't claim you observed it. Verify what you _can_ (the pre-state renders, the transition fires, the code path is wired and type-checks) and report the end state as "wired, not observed." Don't chain `sleep`s to brute-force it.
