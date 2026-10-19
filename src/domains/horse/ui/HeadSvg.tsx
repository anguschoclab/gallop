import type { AppearanceDNA, HorseMarkings } from "@/platform/game/types";
import type { getPalette } from "@/domains/horse/application/horseFacade";
import { cn } from "@/shared/lib/cn";
import { forwardRef } from "react";

export interface SvgProps {
  uid: string;
  palette: ReturnType<typeof getPalette>;
  dna: AppearanceDNA;
  feminine: boolean;
  face: HorseMarkings["face"];
  alt: string;
  className?: string;
}

/** Neutral backdrop tints keyed by dna.backgroundId — never performance-linked. */
const BACKGROUNDS: Record<string, [string, string]> = {
  dawn: ["#3b3f52", "#14161f"],
  paddock: ["#2e4034", "#10170f"],
  stable: ["#3a2f28", "#150f0a"],
  dusk: ["#33263c", "#120e18"],
};

/** Painterly texture strength by coat finish. */
const TEXTURE_OPACITY: Record<string, number> = {
  sleek: 0.05,
  sheen: 0.1,
  coarse: 0.16,
};

export const HeadSvg = forwardRef<SVGSVGElement, SvgProps>(function HeadSvg(
  { uid, palette, dna, feminine, face, alt, className },
  ref,
) {
  const muzzleScale = (feminine ? 0.94 : 1.0) * dna.muzzleWidth;
  const headLen = dna.headLength;
  const [bg1, bg2] = BACKGROUNDS[dna.backgroundId] ?? BACKGROUNDS.paddock;
  const lightAngle = dna.lightAngle;
  const lightStrength = dna.lightStrength;
  const textureOpacity = TEXTURE_OPACITY[dna.coatTexture] ?? TEXTURE_OPACITY.sheen;

  // Anatomy multipliers
  const cheekR = 48 * headLen * dna.cheekFullness;
  const jawInset = 10 * dna.jawTaper;
  const nostrilR = 3.6 * dna.nostrilFlare;

  return (
    <svg
      ref={ref}
      role="img"
      aria-label={alt}
      viewBox="0 0 220 220"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full h-full block", className)}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id={`${uid}-bg`} cx="50%" cy="38%" r="80%">
          <stop offset="0%" stopColor={bg1} />
          <stop offset="100%" stopColor={bg2} />
        </radialGradient>
        <linearGradient id={`${uid}-body`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={palette.bodyHighlight} />
          <stop offset="55%" stopColor={palette.body} />
          <stop offset="100%" stopColor={palette.bodyShade} />
        </linearGradient>
        <linearGradient id={`${uid}-mane`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={palette.mane} />
          <stop offset="100%" stopColor={palette.maneShade} />
        </linearGradient>
        <radialGradient id={`${uid}-cheek`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={palette.bodyHighlight} stopOpacity="0.6" />
          <stop offset="100%" stopColor={palette.bodyHighlight} stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id={`${uid}-light`}
          gradientTransform={`rotate(${lightAngle} 0.5 0.5)`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="#fff" stopOpacity={lightStrength * 0.35} />
          <stop offset="55%" stopColor="#fff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity={lightStrength * 0.3} />
        </linearGradient>
        <filter id={`${uid}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n" />
          <feColorMatrix
            in="n"
            type="matrix"
            values="0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0.6 0"
          />
          <feComposite operator="in" in2="SourceGraphic" />
        </filter>
        <clipPath id={`${uid}-clip`}>
          <g transform={`rotate(${dna.headTilt} 110 110)`}>
            <path d="M 30 220 L 30 145 Q 50 100 95 95 L 150 95 L 175 220 Z" />
            <ellipse
              cx="135"
              cy={108 + dna.eyeY}
              rx={cheekR}
              ry={32}
              transform="rotate(-18 135 108)"
            />
            <ellipse
              cx={172 * headLen}
              cy={140 + dna.eyeY}
              rx={20 * muzzleScale}
              ry={16 * muzzleScale}
              transform="rotate(-18 172 140)"
            />
          </g>
        </clipPath>
      </defs>

      {/* BACKDROP */}
      <rect width="220" height="220" fill={`url(#${uid}-bg)`} />
      <rect width="220" height="220" fill="black" opacity="0.08" />

      <g transform={`rotate(${dna.headTilt} 110 110)`}>
        {/* MANE */}
        {dna.maneStyle !== "roached" && (
          <path
            d={`M 96 92
                Q ${88 + dna.maneWaves[0]} 110 ${82 + dna.maneWaves[1]} 135
                Q ${74 + dna.maneWaves[2]} 165 ${72 + dna.maneWaves[3]} 220
                L 50 220
                Q 56 165 70 130
                Q 82 100 96 92 Z`}
            fill={`url(#${uid}-mane)`}
            opacity={dna.maneStyle === "long" ? 1 : 0.85}
          />
        )}
        {dna.maneStyle === "roached" && (
          <path d="M 96 92 Q 80 130 74 165 L 66 165 Q 74 120 90 92 Z" fill={palette.maneShade} />
        )}
        {/* NECK */}
        <path
          d="M 60 220 Q 70 160 95 130 Q 110 110 138 102 L 168 220 Z"
          fill={`url(#${uid}-body)`}
        />
        {/* HEAD — shaped skull, tapered jaw, muzzle */}
        <g transform="rotate(-18 135 108)">
          <path
            d={`M ${135 - cheekR} ${108 + dna.eyeY}
                Q ${135 - cheekR} ${84 + dna.eyeY} 135 ${80 + dna.eyeY}
                Q ${135 + cheekR} ${84 + dna.eyeY} ${135 + cheekR} ${108 + dna.eyeY}
                Q ${135 + cheekR - jawInset} ${130 + dna.eyeY} ${160 + jawInset} ${136 + dna.eyeY}
                Q 140 ${140 + dna.eyeY} ${135 - cheekR + jawInset} ${124 + dna.eyeY} Z`}
            fill={`url(#${uid}-body)`}
          />
          <ellipse
            cx={172 * headLen}
            cy={140 + dna.eyeY}
            rx={20 * muzzleScale}
            ry={16 * muzzleScale}
            fill={`url(#${uid}-body)`}
          />
          <ellipse
            cx={178 * headLen}
            cy={144 + dna.eyeY}
            rx={12 * muzzleScale}
            ry={9 * muzzleScale}
            fill={palette.muzzle}
            opacity="0.85"
          />
          {/* chin groove */}
          <path
            d={`M ${168 * headLen} ${152 + dna.eyeY} Q ${178 * headLen} ${156 + dna.eyeY} ${186 * headLen} ${150 + dna.eyeY}`}
            stroke={palette.bodyShade}
            strokeWidth="1.2"
            fill="none"
            opacity="0.5"
          />
        </g>

        <g clipPath={`url(#${uid}-clip)`}>
          {palette.hasDorsalStripe && (
            <path
              d="M 70 220 Q 85 160 110 120 L 118 124 Q 96 165 82 220 Z"
              fill={palette.points}
              opacity="0.55"
            />
          )}
          {dna.flecks.map((f, i) => (
            <circle key={`f${i}`} cx={f.x} cy={f.y} r={f.r} fill="#f4f0ea" opacity="0.55" />
          ))}
          {dna.dapples.map((d, i) => (
            <circle
              key={`d${i}`}
              cx={d.x}
              cy={d.y}
              r={d.r}
              fill={palette.bodyHighlight}
              opacity="0.35"
            />
          ))}
          {face === "bald" && (
            <path
              d="M 130 88 Q 152 90 168 100 Q 185 120 188 145 Q 175 158 158 152 Q 142 130 130 110 Z"
              fill="#f6f1e7"
              opacity="0.95"
            />
          )}
          {face === "blaze" && (
            <path
              d="M 138 92 Q 150 100 162 118 Q 172 138 178 152 Q 168 156 158 152 Q 150 130 138 108 Z"
              fill="#f6f1e7"
              opacity="0.95"
            />
          )}
          {face === "star" && (
            <ellipse cx="148" cy="106" rx="7" ry="9" fill="#f6f1e7" opacity="0.95" />
          )}
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
        <g transform="rotate(-18 135 108)">
          {dna.earPose !== "back" && (
            <>
              <path
                d={`M ${110 - 6 * dna.earSpread} 78 L ${118 - 2 * dna.earSpread} ${dna.earPose === "relaxed" ? 62 : 56} L ${126 + 2 * dna.earSpread} 80 Z`}
                fill={palette.bodyShade}
              />
              <path
                d={`M ${130 + 4 * dna.earSpread} 76 L ${140 + 8 * dna.earSpread} ${dna.earPose === "relaxed" ? 60 : 54} L ${148 + 12 * dna.earSpread} 78 Z`}
                fill={palette.body}
              />
            </>
          )}
          {dna.earPose === "back" && (
            <>
              <path
                d={`M ${108 - 6 * dna.earSpread} 80 L ${100 - 4 * dna.earSpread} 62 L ${118 - 2 * dna.earSpread} 78 Z`}
                fill={palette.bodyShade}
              />
              <path
                d={`M ${128 + 4 * dna.earSpread} 78 L ${122 + 6 * dna.earSpread} 58 L ${140 + 8 * dna.earSpread} 74 Z`}
                fill={palette.body}
              />
            </>
          )}
        </g>

        {/* FORELOCK */}
        {dna.forelockStyle === "sweep" && (
          <path
            d={`M 120 70 Q ${128 + dna.forelockSweep} 80 ${124 + dna.forelockSweep} 100 Q ${116 + dna.forelockSweep} 92 114 78 Z`}
            fill={`url(#${uid}-mane)`}
          />
        )}
        {dna.forelockStyle === "tuft" && (
          <ellipse
            cx={120 + dna.forelockSweep * 0.5}
            cy={76}
            rx="8"
            ry="5"
            fill={`url(#${uid}-mane)`}
          />
        )}

        {/* EYE — eyelid openness from eyeAlertness */}
        <g transform="rotate(-18 135 108)">
          <ellipse
            cx="138"
            cy={104 + dna.eyeY}
            rx="5.2"
            ry={3.6 * Math.min(1.3, Math.max(0.4, dna.eyeAlertness))}
            fill={palette.skin}
          />
          <ellipse
            cx="138"
            cy={104 + dna.eyeY}
            rx="3.8"
            ry={2.6 * Math.min(1.3, Math.max(0.4, dna.eyeAlertness))}
            fill={palette.eye}
          />
          <circle cx="139.2" cy={103 + dna.eyeY} r="0.9" fill="#ffffff" opacity="0.85" />
          {/* upper lid line */}
          <path
            d={`M 132 ${102 + dna.eyeY} Q 138 ${99 + dna.eyeY} 144 ${102 + dna.eyeY}`}
            stroke={palette.bodyShade}
            strokeWidth="0.9"
            fill="none"
            opacity="0.6"
          />
        </g>

        {/* NOSTRIL */}
        <g transform="rotate(-18 135 108)">
          <ellipse
            cx={180 * headLen}
            cy={142 + dna.eyeY}
            rx={nostrilR * 0.75}
            ry={nostrilR}
            fill={palette.eye}
            opacity="0.85"
          />
        </g>

        {/* JAW SHADOW */}
        <path
          d={`M 96 138 Q 118 160 ${150 * dna.jawTaper} 158 Q 130 170 100 162 Z`}
          fill={palette.bodyShade}
          opacity="0.35"
        />

        {/* DIRECTIONAL LIGHT */}
        <rect
          width="220"
          height="220"
          fill={`url(#${uid}-light)`}
          style={{ mixBlendMode: "soft-light" }}
        />
        {/* PAINTERLY GRAIN */}
        <rect
          width="220"
          height="220"
          fill={palette.body}
          filter={`url(#${uid}-grain)`}
          opacity={textureOpacity}
        />
      </g>

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
});
