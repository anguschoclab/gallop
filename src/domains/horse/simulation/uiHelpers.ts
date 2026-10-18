/**
 * Horse UI Helper Functions
 *
 * Utility functions for displaying horse-related UI elements.
 * These functions are extracted from HorseCard.tsx for potential reuse.
 */

/**
 * Get the CSS color variable for a horse coat color.
 * @param color - The coat color identifier
 * @returns CSS custom property for the coat color
 */
export function getCoatColor(color?: string): string {
  // Use CSS custom properties defined in styles.css instead of hardcoded hex codes
  const map: Record<string, string> = {
    bay: "var(--coat-bay)",
    "dark-bay": "var(--coat-dark-bay)",
    black: "var(--coat-black)",
    chestnut: "var(--coat-chestnut)",
    gray: "var(--coat-gray)",
    palomino: "var(--coat-palomino)",
    buckskin: "var(--coat-buckskin)",
    roan: "var(--coat-roan)",
    white: "var(--coat-white)",
    "seal-brown": "var(--coat-seal-brown)",
    "liver-chestnut": "var(--coat-liver-chestnut)",
    dun: "var(--coat-dun)",
    grulla: "var(--coat-grulla)",
    champagne: "var(--coat-champagne)",
  };
  return map[color || "bay"] || "var(--coat-bay)";
}

/**
 * Get the injury label based on injury proneness.
 * @param proneness - The injury proneness value (0-1)
 * @returns Human-readable injury label
 */
export function getInjuryLabel(proneness?: number): string {
  if (!proneness) return "Solid";
  if (proneness < 0.03) return "Iron Horse";
  if (proneness < 0.06) return "Durable";
  if (proneness < 0.09) return "Average";
  return "Fragile";
}

/**
 * Get the color class for injury proneness display.
 * @param proneness - The injury proneness value (0-1)
 * @returns Tailwind CSS color class
 */
export function getInjuryColor(proneness?: number): string {
  if (!proneness) return "text-cream-muted";
  if (proneness < 0.06) return "text-success font-medium";
  if (proneness < 0.09) return "text-warning font-medium";
  return "text-destructive font-bold";
}
