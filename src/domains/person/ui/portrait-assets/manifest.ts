/**
 * person/ui/portrait-assets/manifest.ts - In-code layer manifest for procedural portraits
 *
 * The shipped asset pack is represented here as SVG primitives and color tokens.
 * Each layer has a stable ID; the generator stores IDs, not array indexes.
 */

import type { PersonAppearanceDNA, PortraitContext } from "@/domains/person/model/types";

export interface LayerDefinition {
  id: string;
  z: number;
  render: (ctx: LayerRenderContext) => React.ReactNode;
}

export interface LayerRenderContext {
  identity: PersonAppearanceDNA;
  context: PortraitContext;
  width: number;
  height: number;
  silk?: { primary: string; secondary: string; cap: string; pattern: string } | null;
}

export const FACE_BASES: Record<string, (w: number, h: number) => string> = {
  oval: (w, h) =>
    `M${w * 0.28},${h * 0.25} C${w * 0.28},${h * 0.12} ${w * 0.72},${h * 0.12} ${w * 0.72},${h * 0.25} C${w * 0.72},${h * 0.55} ${w * 0.65},${h * 0.72} ${w * 0.5},${h * 0.72} C${w * 0.35},${h * 0.72} ${w * 0.28},${h * 0.55} ${w * 0.28},${h * 0.25} Z`,
  round: (w, h) =>
    `M${w * 0.3},${h * 0.26} C${w * 0.3},${h * 0.14} ${w * 0.7},${h * 0.14} ${w * 0.7},${h * 0.26} C${w * 0.7},${h * 0.55} ${w * 0.62},${h * 0.74} ${w * 0.5},${h * 0.74} C${w * 0.38},${h * 0.74} ${w * 0.3},${h * 0.55} ${w * 0.3},${h * 0.26} Z`,
  square: (w, h) =>
    `M${w * 0.28},${h * 0.24} L${w * 0.72},${h * 0.24} L${w * 0.7},${h * 0.7} L${w * 0.3},${h * 0.7} Z`,
  heart: (w, h) =>
    `M${w * 0.3},${h * 0.28} C${w * 0.3},${h * 0.15} ${w * 0.5},${h * 0.2} ${w * 0.5},${h * 0.2} C${w * 0.5},${h * 0.2} ${w * 0.7},${h * 0.15} ${w * 0.7},${h * 0.28} C${w * 0.7},${h * 0.55} ${w * 0.62},${h * 0.72} ${w * 0.5},${h * 0.75} C${w * 0.38},${h * 0.72} ${w * 0.3},${h * 0.55} ${w * 0.3},${h * 0.28} Z`,
  long: (w, h) =>
    `M${w * 0.3},${h * 0.22} C${w * 0.3},${h * 0.1} ${w * 0.7},${h * 0.1} ${w * 0.7},${h * 0.22} C${w * 0.7},${h * 0.58} ${w * 0.65},${h * 0.78} ${w * 0.5},${h * 0.78} C${w * 0.35},${h * 0.78} ${w * 0.3},${h * 0.58} ${w * 0.3},${h * 0.22} Z`,
  angular: (w, h) =>
    `M${w * 0.32},${h * 0.22} L${w * 0.68},${h * 0.26} L${w * 0.66},${h * 0.7} L${w * 0.34},${h * 0.68} Z`,
};

export function getFacePath(id: string, w: number, h: number): string {
  const fn = FACE_BASES[id] ?? FACE_BASES.oval;
  return fn(w, h);
}

export function getSkinTone(id: string): string {
  // Skin tone IDs are stored as hex values in the generator.
  return id;
}

export function getHairColor(id: string): string {
  return id;
}

export function getEyeColor(id: string): string {
  return id;
}

export function isRacewearContext(context: PortraitContext): boolean {
  return context === "jockey-racewear";
}
