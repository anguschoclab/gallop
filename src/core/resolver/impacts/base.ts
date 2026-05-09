/**
 * impacts/base.ts - Base impact type
 *
 * This file provides the base interface for all impact types.
 *
 * Dependencies: None
 * Related files: ./index.ts (exports base type), ../resolver.ts (uses impacts)
 */

// Base impact type
export interface Impact {
  id: string;
  intentId: string;
  day: number;
  phase: string;
  logLevel: "always" | "conditional" | "never";
}
