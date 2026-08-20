import type { CoatColor, HorseMarkings, HorseGender, AppearanceDNA } from "@/game/types";
import {
  getPalette,
  getOrDeriveAppearance,
  isFeminine,
  hashSeed,
} from "@/core/horse/proceduralPortrait";
import { useMemo, forwardRef } from "react";
import { HeadSvg } from "./HeadSvg";
import { FullBodySvg } from "./FullBodySvg";

interface Props {
  id?: string;
  coatColor?: CoatColor;
  markings?: HorseMarkings;
  gender?: HorseGender;
  /** Persisted appearance DNA — preferred when present. */
  appearance?: AppearanceDNA;
  /** "head" = head + neck portrait. "full" = full standing horse. */
  view?: "head" | "full";
  className?: string;
  alt?: string;
}

/**
 * Procedural horse SVG. "head" view is a tight portrait; "full" is a
 * standing side-on full-body silhouette with legs, tail and per-leg sock
 * markings.
 *
 * Inspired by Football Manager's "newgen" facegen — a parametric compositor
 * that yields a unique image per individual without shipping bespoke art.
 */
export const ProceduralHorsePortrait = forwardRef<SVGSVGElement, Props>(
  function ProceduralHorsePortrait(
    {
      id,
      coatColor,
      markings,
      gender,
      appearance,
      view = "head",
      className,
      alt = "Horse portrait",
    },
    ref,
  ) {
    const palette = useMemo(() => getPalette(coatColor), [coatColor]);
    const dna = useMemo(
      () => getOrDeriveAppearance(id, coatColor, markings, appearance),
      [id, coatColor, markings, appearance],
    );

    const uid = useMemo(() => `pp-${hashSeed(id ?? `${dna.seed}`).toString(36)}`, [id, dna.seed]);

    const feminine = isFeminine(gender);
    const face = markings?.face ?? "none";

    return view === "full" ? (
      <FullBodySvg
        ref={ref}
        uid={uid}
        palette={palette}
        dna={dna}
        feminine={feminine}
        face={face}
        alt={alt}
        className={className}
      />
    ) : (
      <HeadSvg
        ref={ref}
        uid={uid}
        palette={palette}
        dna={dna}
        feminine={feminine}
        face={face}
        alt={alt}
        className={className}
      />
    );
  },
);
