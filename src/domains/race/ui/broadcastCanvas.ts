/**
 * Resolved canvas palette. Values come from the --broadcast-* custom
 * properties in styles.css; the fallbacks mirror their dark-theme values so
 * the viewer still renders when computed styles are unavailable (tests, SSR).
 */
export interface CanvasTheme {
  turf: string;
  dirt: string;
  lane: string;
  marker: string;
  finish: string;
  accent: string;
  text: string;
  silkFallback: string;
}

// Canvas fillStyle cannot resolve var() — colors are read once from the
// --broadcast-* custom properties via getComputedStyle, with these hex
// values kept only as deterministic fallbacks mirroring styles.css.
export const CANVAS_FALLBACK: CanvasTheme = {
  turf: "#2d5a27",
  dirt: "#8b4513",
  lane: "rgba(255, 255, 255, 0.3)",
  marker: "rgba(255, 255, 255, 0.5)",
  finish: "#fff",
  accent: "#facc15",
  text: "#fff",
  silkFallback: "#666",
};

/** Read a custom property, falling back when unset or running outside a real DOM. */
function readToken(styles: CSSStyleDeclaration, name: string, fallback: string): string {
  const value = styles.getPropertyValue(name).trim();
  return value === "" ? fallback : value;
}

/**
 * Build the canvas palette from CSS custom properties. Called once per
 * background invalidation so theme switches are picked up without re-reading
 * getComputedStyle every frame.
 */
export function readCanvasTheme(doc: Document = document): CanvasTheme {
  if (typeof getComputedStyle !== "function") return CANVAS_FALLBACK;
  const styles = getComputedStyle(doc.documentElement);
  const rail = readToken(styles, "--broadcast-rail", "#fff");
  const accent = readToken(styles, "--broadcast-accent", CANVAS_FALLBACK.accent);
  return {
    turf: readToken(styles, "--broadcast-turf", CANVAS_FALLBACK.turf),
    dirt: readToken(styles, "--broadcast-dirt", CANVAS_FALLBACK.dirt),
    lane: `color-mix(in oklab, ${rail} 30%, transparent)`,
    marker: `color-mix(in oklab, ${rail} 50%, transparent)`,
    finish: rail,
    accent,
    text: rail,
    silkFallback: readToken(styles, "--silver", CANVAS_FALLBACK.silkFallback),
  };
}

/** True when the OS or the player has asked for reduced decorative motion. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Time quantum used to step the replay when smooth motion is disabled. */
export const REDUCED_MOTION_STEP_S = 0.5;

/**
 * Under reduced motion (or animationsEnabled = false) the replay still
 * advances — positions, leader changes, and the scrubber all update — but
 * time moves in discrete steps instead of smooth interpolation.
 */
export function resolveFrameTime(time: number, motionAllowed: boolean): number {
  return motionAllowed ? time : Math.floor(time / REDUCED_MOTION_STEP_S) * REDUCED_MOTION_STEP_S;
}
