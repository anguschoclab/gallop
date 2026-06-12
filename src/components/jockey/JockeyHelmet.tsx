/**
 * JockeyHelmet.tsx - SVG helmet, goggles, and chin strap rendering
 *
 * Extracted from JockeyPortrait.tsx.
 */

interface JockeyHelmetProps {
  cap: string;
  secondary: string;
  stroke: string;
  strokeW: number;
}

export function JockeyHelmet({ cap, secondary, stroke, strokeW }: JockeyHelmetProps) {
  return (
    <g>
      {/* Helmet shell */}
      <path
        d="M22 48 Q22 24 50 22 Q78 24 78 48 Q78 50 76 50 L24 50 Q22 50 22 48 Z"
        fill={cap}
        stroke={stroke}
        strokeWidth={strokeW}
      />
      {/* Helmet peak/visor */}
      <path
        d="M20 48 Q50 54 80 48 L78 51 Q50 56 22 51 Z"
        fill={cap}
        stroke={stroke}
        strokeWidth={strokeW}
      />
      {/* Helmet accent: secondary stripe */}
      <path d="M30 30 Q50 26 70 30 L70 34 Q50 30 30 34 Z" fill={secondary} opacity="0.85" />
      {/* Helmet button */}
      <circle cx="50" cy="24" r="1.6" fill={secondary} stroke={stroke} strokeWidth={0.4} />
      {/* Helmet shine */}
      <path
        d="M30 28 Q35 24 44 24"
        fill="none"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth={1.4}
        strokeLinecap="round"
      />

      {/* Goggles strap across helmet */}
      <rect x="22" y="44" width="56" height="3" fill="rgba(0,0,0,0.6)" />
      {/* Goggles lenses on visor edge */}
      <ellipse
        cx="40"
        cy="49.5"
        rx="6"
        ry="3"
        fill="rgba(80,140,180,0.55)"
        stroke={stroke}
        strokeWidth={0.6}
      />
      <ellipse
        cx="60"
        cy="49.5"
        rx="6"
        ry="3"
        fill="rgba(80,140,180,0.55)"
        stroke={stroke}
        strokeWidth={0.6}
      />
      <line x1="46" y1="49.5" x2="54" y2="49.5" stroke="rgba(0,0,0,0.6)" strokeWidth="1" />

      {/* Chin strap */}
      <path d={`M30 50 Q34 78 46 82`} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={0.9} />
      <path d={`M70 50 Q66 78 54 82`} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={0.9} />
    </g>
  );
}
