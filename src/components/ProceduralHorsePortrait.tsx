import type { CoatColor, HorseMarkings, HorseGender } from "@/game/types";
import { getPalette, buildVariation } from "@/core/horse/proceduralPortrait";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface Props {
  id?: string;
  coatColor?: CoatColor;
  markings?: HorseMarkings;
  gender?: HorseGender;
  className?: string;
  alt?: string;
}

/**
 * Procedurally generated horse head-and-neck portrait. Deterministic from
 * horse.id; coat color, markings, and gender drive the rendered look.
 *
 * Inspired by Football Manager's "newgen" facegen — a simple parametric
 * compositor that yields a unique image per individual without shipping
 * thousands of assets.
 */
export function ProceduralHorsePortrait({
  id,
  coatColor,
  markings,
  gender,
  className,
  alt = "Horse portrait",
}: Props) {
  const palette = useMemo(() => getPalette(coatColor), [coatColor]);
  const variation = useMemo(
    () => buildVariation(id, markings, gender, palette),
    [id, markings, gender, palette],
  );

  // Unique gradient ids so multiple portraits can coexist on a page.
  const uid = useMemo(
    () => `pp-${Math.abs(hashStr(id ?? Math.random().toString())).toString(36)}`,
    [id],
  );

  // Slight muzzle taper for mares/fillies
  const muzzleScale = variation.feminine ? 0.94 : 1.0;
  const headLen = variation.headLength;

  return (
    <svg
      role="img"
      aria-label={alt}
      viewBox="0 0 220 220"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full h-full block", className)}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Backdrop */}
        <radialGradient id={`${uid}-bg`} cx="50%" cy="40%" r="75%">
          <stop offset="0%" stopColor={palette.bg1} />
          <stop offset="100%" stopColor={palette.bg2} />
        </radialGradient>

        {/* Body shading */}
        <linearGradient id={`${uid}-body`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={palette.bodyHighlight} />
          <stop offset="55%" stopColor={palette.body} />
          <stop offset="100%" stopColor={palette.bodyShade} />
        </linearGradient>

        {/* Mane */}
        <linearGradient id={`${uid}-mane`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={palette.mane} />
          <stop offset="100%" stopColor={palette.maneShade} />
        </linearGradient>

        {/* Soft cheek glow */}
        <radialGradient id={`${uid}-cheek`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={palette.bodyHighlight} stopOpacity="0.6" />
          <stop offset="100%" stopColor={palette.bodyHighlight} stopOpacity="0" />
        </radialGradient>

        {/* Clip head shape so dapples / flecks stay inside */}
        <clipPath id={`${uid}-clip`}>
          <g transform={`rotate(${variation.headTilt} 110 110)`}>
            {/* Neck */}
            <path d="M 30 220 L 30 145 Q 50 100 95 95 L 150 95 L 175 220 Z" />
            {/* Head ellipse */}
            <ellipse
              cx="135"
              cy={108 + variation.eyeY}
              rx={48 * headLen}
              ry={32}
              transform={`rotate(-18 135 108)`}
            />
            {/* Muzzle bulb */}
            <ellipse
              cx={172 * headLen}
              cy={140 + variation.eyeY}
              rx={20 * muzzleScale}
              ry={16 * muzzleScale}
              transform={`rotate(-18 172 140)`}
            />
          </g>
        </clipPath>
      </defs>

      {/* Backdrop */}
      <rect width="220" height="220" fill={`url(#${uid}-bg)`} />

      {/* Subtle vignette */}
      <rect width="220" height="220" fill="black" opacity="0.08" />

      <g transform={`rotate(${variation.headTilt} 110 110)`}>
        {/* MANE — flowing behind neck */}
        <path
          d={`M 96 92
              Q ${88 + variation.maneWaves[0]} 110 ${82 + variation.maneWaves[1]} 135
              Q ${74 + variation.maneWaves[2]} 165 ${72 + variation.maneWaves[3]} 220
              L 50 220
              Q 56 165 70 130
              Q 82 100 96 92 Z`}
          fill={`url(#${uid}-mane)`}
        />

        {/* NECK + HEAD silhouette (single combined shape for clean outline) */}
        <g>
          {/* Neck */}
          <path
            d="M 60 220
               Q 70 160 95 130
               Q 110 110 138 102
               L 168 220 Z"
            fill={`url(#${uid}-body)`}
          />

          {/* Head */}
          <g transform={`rotate(-18 135 108)`}>
            <ellipse
              cx="135"
              cy={108 + variation.eyeY}
              rx={48 * headLen}
              ry={32}
              fill={`url(#${uid}-body)`}
            />
            {/* Muzzle */}
            <ellipse
              cx={172 * headLen}
              cy={140 + variation.eyeY}
              rx={20 * muzzleScale}
              ry={16 * muzzleScale}
              fill={`url(#${uid}-body)`}
            />
            {/* Soft muzzle (lighter / pink for white & champagne) */}
            <ellipse
              cx={178 * headLen}
              cy={144 + variation.eyeY}
              rx={12 * muzzleScale}
              ry={9 * muzzleScale}
              fill={palette.muzzle}
              opacity="0.85"
            />
          </g>
        </g>

        {/* Inner clipped detail: dapples, flecks, dorsal stripe, face white */}
        <g clipPath={`url(#${uid}-clip)`}>
          {/* Dorsal stripe (dun / grulla) */}
          {palette.hasDorsalStripe && (
            <path
              d="M 70 220 Q 85 160 110 120 L 118 124 Q 96 165 82 220 Z"
              fill={palette.points}
              opacity="0.55"
            />
          )}

          {/* Roan flecks */}
          {variation.flecks.map((f, i) => (
            <circle key={`f${i}`} cx={f.x} cy={f.y} r={f.r} fill="#f4f0ea" opacity="0.55" />
          ))}

          {/* Dapples */}
          {variation.dapples.map((d, i) => (
            <circle
              key={`d${i}`}
              cx={d.x}
              cy={d.y}
              r={d.r}
              fill={palette.bodyHighlight}
              opacity="0.35"
            />
          ))}

          {/* Face white markings */}
          {variation.bald && (
            <path
              d="M 130 88 Q 152 90 168 100 Q 185 120 188 145 Q 175 158 158 152 Q 142 130 130 110 Z"
              fill="#f6f1e7"
              opacity="0.95"
            />
          )}
          {variation.blaze && !variation.bald && (
            <path
              d="M 138 92 Q 150 100 162 118 Q 172 138 178 152 Q 168 156 158 152 Q 150 130 138 108 Z"
              fill="#f6f1e7"
              opacity="0.95"
            />
          )}
          {variation.star && !variation.blaze && !variation.bald && (
            <ellipse cx="148" cy="106" rx="7" ry="9" fill="#f6f1e7" opacity="0.95" />
          )}

          {/* Cheek highlight */}
          <ellipse
            cx="128"
            cy="118"
            rx="22"
            ry="14"
            fill={`url(#${uid}-cheek)`}
            transform="rotate(-15 128 118)"
          />
        </g>

        {/* EARS */}
        <g transform={`rotate(-18 135 108)`}>
          <path
            d={`M ${110 - 6 * variation.earSpread} 78
                L ${118 - 2 * variation.earSpread} 56
                L ${126 + 2 * variation.earSpread} 80 Z`}
            fill={palette.bodyShade}
          />
          <path
            d={`M ${110 - 6 * variation.earSpread + 2} 78
                L ${118 - 2 * variation.earSpread + 1} 62
                L ${122 + 2 * variation.earSpread} 79 Z`}
            fill={palette.points}
            opacity="0.7"
          />
          <path
            d={`M ${130 + 4 * variation.earSpread} 76
                L ${140 + 8 * variation.earSpread} 54
                L ${148 + 12 * variation.earSpread} 78 Z`}
            fill={palette.body}
          />
          <path
            d={`M ${133 + 4 * variation.earSpread} 76
                L ${140 + 8 * variation.earSpread} 60
                L ${145 + 10 * variation.earSpread} 76 Z`}
            fill={palette.points}
            opacity="0.55"
          />
        </g>

        {/* FORELOCK between ears */}
        <path
          d={`M 120 70
              Q ${128 + variation.forelockSweep} 80 ${124 + variation.forelockSweep} 100
              Q ${116 + variation.forelockSweep} 92 114 78 Z`}
          fill={`url(#${uid}-mane)`}
        />

        {/* EYE */}
        <g transform={`rotate(-18 135 108)`}>
          <ellipse cx="138" cy={104 + variation.eyeY} rx="5.2" ry="3.6" fill={palette.skin} />
          <ellipse cx="138" cy={104 + variation.eyeY} rx="3.8" ry="2.6" fill={palette.eye} />
          <circle cx="139.2" cy={103 + variation.eyeY} r="0.9" fill="#ffffff" opacity="0.85" />
        </g>

        {/* NOSTRIL */}
        <g transform={`rotate(-18 135 108)`}>
          <ellipse
            cx={180 * headLen}
            cy={142 + variation.eyeY}
            rx="2.6"
            ry="3.6"
            fill={palette.eye}
            opacity="0.85"
          />
        </g>

        {/* MOUTH crease */}
        <g transform={`rotate(-18 135 108)`}>
          <path
            d={`M ${168 * headLen} ${150 + variation.eyeY} Q ${178 * headLen} ${152 + variation.eyeY} ${184 * headLen} ${148 + variation.eyeY}`}
            stroke={palette.bodyShade}
            strokeWidth="0.8"
            fill="none"
            opacity="0.6"
          />
        </g>

        {/* Jaw shadow */}
        <path
          d="M 96 138 Q 118 160 150 158 Q 130 170 100 162 Z"
          fill={palette.bodyShade}
          opacity="0.35"
        />
      </g>

      {/* Outer rim shadow */}
      <rect
        width="220"
        height="220"
        fill="none"
        stroke="black"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
    </svg>
  );
}

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return h;
}
