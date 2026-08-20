import type { AppearanceDNA, HorseMarkings } from "@/game/types";
import type { getPalette } from "@/core/horse/proceduralPortrait";
import { cn } from "@/lib/cn";
import { forwardRef } from "react";
import type { SvgProps } from "./HeadSvg";

const SOCK_HEIGHT_PX = { none: 0, sock: 14, stocking: 28 } as const;

export const FullBodySvg = forwardRef<SVGSVGElement, SvgProps>(function FullBodySvg(
  { uid, palette, dna, feminine, face, alt, className },
  ref,
) {
  const bodyW = 150 * dna.bodyLength;
  const bodyH = 70 * dna.bodyDepth;
  const bodyCX = 175;
  const bodyCY = 150;
  const legL = 80 * dna.legLength;
  const legTop = bodyCY + bodyH * 0.4;
  const groundY = legTop + legL;
  const muzzleScale = feminine ? 0.94 : 1.0;

  const legXs = [
    bodyCX - bodyW * 0.42, // FL
    bodyCX - bodyW * 0.32, // FR
    bodyCX + bodyW * 0.32, // HL
    bodyCX + bodyW * 0.42, // HR
  ];

  return (
    <svg
      ref={ref}
      role="img"
      aria-label={alt}
      viewBox="0 0 360 280"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full h-full block", className)}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id={`${uid}-bg`} cx="50%" cy="40%" r="75%">
          <stop offset="0%" stopColor={palette.bg1} />
          <stop offset="100%" stopColor={palette.bg2} />
        </radialGradient>
        <linearGradient id={`${uid}-body`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={palette.bodyHighlight} />
          <stop offset="60%" stopColor={palette.body} />
          <stop offset="100%" stopColor={palette.bodyShade} />
        </linearGradient>
        <linearGradient id={`${uid}-mane`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={palette.mane} />
          <stop offset="100%" stopColor={palette.maneShade} />
        </linearGradient>
        <clipPath id={`${uid}-bclip`}>
          <ellipse cx={bodyCX} cy={bodyCY} rx={bodyW * 0.5} ry={bodyH * 0.55} />
        </clipPath>
      </defs>

      {/* Backdrop */}
      <rect width="360" height="280" fill={`url(#${uid}-bg)`} />
      <rect width="360" height="280" fill="black" opacity="0.06" />

      {/* Ground shadow */}
      <ellipse cx={bodyCX} cy={groundY + 6} rx={bodyW * 0.55} ry="6" fill="black" opacity="0.32" />

      {/* TAIL */}
      <g
        transform={`translate(${bodyCX + bodyW * 0.5}, ${bodyCY - bodyH * 0.1}) rotate(${dna.tailSweep})`}
      >
        <path
          d={`M 0 0 Q ${15 * dna.tailFullness} 30 ${10 * dna.tailFullness} ${70 * dna.tailFullness}
              Q ${-5 * dna.tailFullness} ${85 * dna.tailFullness} ${-12 * dna.tailFullness} ${75 * dna.tailFullness}
              Q ${-2 * dna.tailFullness} 35 -4 0 Z`}
          fill={`url(#${uid}-mane)`}
        />
      </g>

      {/* BACK LEGS (drawn first so front legs overlap them) */}
      {[2, 3].map((i) => {
        const x = legXs[i];
        const sock = dna.socks[i];
        const sockH = SOCK_HEIGHT_PX[sock];
        return (
          <g key={`bl${i}`}>
            <rect
              x={x - 6}
              y={legTop}
              width="12"
              height={legL - 12}
              fill={`url(#${uid}-body)`}
              rx="3"
            />
            {/* Hock bulge */}
            <ellipse cx={x} cy={legTop + 10} rx="8" ry="6" fill={palette.body} />
            {/* Sock */}
            {sockH > 0 && (
              <rect
                x={x - 6.5}
                y={groundY - sockH - 8}
                width="13"
                height={sockH}
                fill="#f6f1e7"
                rx="2"
              />
            )}
            {/* Hoof */}
            <rect x={x - 7} y={groundY - 8} width="14" height="9" fill={palette.hoof} rx="2" />
          </g>
        );
      })}

      {/* BODY (barrel) */}
      <ellipse
        cx={bodyCX}
        cy={bodyCY}
        rx={bodyW * 0.5}
        ry={bodyH * 0.55}
        fill={`url(#${uid}-body)`}
      />

      {/* Body details: dapples, flecks, dorsal stripe */}
      <g clipPath={`url(#${uid}-bclip)`}>
        {palette.hasDorsalStripe && (
          <rect
            x={bodyCX - bodyW * 0.5}
            y={bodyCY - bodyH * 0.5}
            width={bodyW}
            height="4"
            fill={palette.points}
            opacity="0.55"
          />
        )}
        {dna.dapples.map((d, i) => (
          <circle
            key={`d${i}`}
            cx={bodyCX - bodyW * 0.4 + (d.x / 220) * bodyW * 0.8}
            cy={bodyCY - bodyH * 0.3 + (d.y / 220) * bodyH * 0.7}
            r={d.r * 0.9}
            fill={palette.bodyHighlight}
            opacity="0.32"
          />
        ))}
        {dna.flecks.map((f, i) => (
          <circle
            key={`f${i}`}
            cx={bodyCX - bodyW * 0.45 + (f.x / 220) * bodyW * 0.9}
            cy={bodyCY - bodyH * 0.45 + (f.y / 220) * bodyH * 0.9}
            r={f.r}
            fill="#f4f0ea"
            opacity="0.5"
          />
        ))}
      </g>

      {/* Belly shadow */}
      <ellipse
        cx={bodyCX}
        cy={bodyCY + bodyH * 0.3}
        rx={bodyW * 0.45}
        ry={bodyH * 0.18}
        fill={palette.bodyShade}
        opacity="0.35"
      />

      {/* CHEST */}
      <ellipse
        cx={bodyCX - bodyW * 0.45}
        cy={bodyCY + 5}
        rx="18"
        ry="22"
        fill={`url(#${uid}-body)`}
      />

      {/* NECK */}
      <path
        d={`M ${bodyCX - bodyW * 0.4} ${bodyCY - 10}
            Q ${bodyCX - bodyW * 0.55} ${bodyCY - 50}
              ${bodyCX - bodyW * 0.7} ${bodyCY - 60}
            L ${bodyCX - bodyW * 0.6} ${bodyCY - 25}
            L ${bodyCX - bodyW * 0.42} ${bodyCY + 18} Z`}
        fill={`url(#${uid}-body)`}
      />

      {/* MANE down the neck */}
      <path
        d={`M ${bodyCX - bodyW * 0.55} ${bodyCY - 50}
            Q ${bodyCX - bodyW * 0.5 + dna.maneWaves[0]} ${bodyCY - 30}
              ${bodyCX - bodyW * 0.45 + dna.maneWaves[1]} ${bodyCY}
            L ${bodyCX - bodyW * 0.4} ${bodyCY - 10}
            Q ${bodyCX - bodyW * 0.55 + dna.maneWaves[2]} ${bodyCY - 35}
              ${bodyCX - bodyW * 0.65 + dna.maneWaves[3]} ${bodyCY - 55} Z`}
        fill={`url(#${uid}-mane)`}
      />

      {/* HEAD */}
      <g
        transform={`translate(${bodyCX - bodyW * 0.7}, ${bodyCY - 60}) rotate(${dna.headTilt - 8})`}
      >
        <ellipse cx="0" cy="0" rx={28 * dna.headLength} ry={16} fill={`url(#${uid}-body)`} />
        <ellipse
          cx={-22 * dna.headLength}
          cy={8}
          rx={12 * muzzleScale}
          ry={9 * muzzleScale}
          fill={`url(#${uid}-body)`}
        />
        <ellipse
          cx={-26 * dna.headLength}
          cy={10}
          rx={7 * muzzleScale}
          ry={5 * muzzleScale}
          fill={palette.muzzle}
          opacity="0.85"
        />
        {/* Face white */}
        {face === "bald" && (
          <path
            d={`M 0 -10 Q -10 -6 -22 4 Q -26 12 -22 16 Q -10 14 -2 6 Z`}
            fill="#f6f1e7"
            opacity="0.95"
          />
        )}
        {face === "blaze" && (
          <path
            d={`M -4 -8 Q -10 0 -20 8 Q -22 12 -18 14 Q -10 8 -4 0 Z`}
            fill="#f6f1e7"
            opacity="0.95"
          />
        )}
        {face === "star" && <ellipse cx="-6" cy="-2" rx="4" ry="5" fill="#f6f1e7" opacity="0.95" />}
        {/* Ear */}
        <path
          d={`M ${10 - 4 * dna.earSpread} -10 L ${4} ${-22 - 2 * dna.earSpread} L ${16 + 2 * dna.earSpread} -8 Z`}
          fill={palette.bodyShade}
        />
        {/* Eye */}
        <ellipse cx="-6" cy="-2" rx="2.4" ry="1.8" fill={palette.eye} />
        {/* Nostril */}
        <ellipse
          cx={-26 * dna.headLength}
          cy="9"
          rx="1.6"
          ry="2.2"
          fill={palette.eye}
          opacity="0.85"
        />
      </g>

      {/* FRONT LEGS */}
      {[0, 1].map((i) => {
        const x = legXs[i];
        const sock = dna.socks[i];
        const sockH = SOCK_HEIGHT_PX[sock];
        return (
          <g key={`fl${i}`}>
            <rect
              x={x - 6}
              y={legTop}
              width="12"
              height={legL - 12}
              fill={`url(#${uid}-body)`}
              rx="3"
            />
            <ellipse cx={x} cy={legTop + 8} rx="7" ry="5" fill={palette.body} />
            {sockH > 0 && (
              <rect
                x={x - 6.5}
                y={groundY - sockH - 8}
                width="13"
                height={sockH}
                fill="#f6f1e7"
                rx="2"
              />
            )}
            <rect x={x - 7} y={groundY - 8} width="14" height="9" fill={palette.hoof} rx="2" />
          </g>
        );
      })}

      {/* Frame */}
      <rect
        width="360"
        height="280"
        fill="none"
        stroke="black"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
    </svg>
  );
});
