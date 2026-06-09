import type { JockeySilk } from "@/game/types";

interface RacingSilksProps {
  silk: JockeySilk;
  size?: number;
  showCap?: boolean;
  className?: string;
}

/**
 * Racing silks SVG — renders a stylized jockey jacket (and optional cap)
 * using the jockey's silk colors and pattern. Inspired by traditional
 * thoroughbred racing colors.
 */
export function RacingSilks({ silk, size = 48, showCap = true, className }: RacingSilksProps) {
  const { primary, secondary, cap, pattern } = silk;
  const id = `silk-${primary.replace("#", "")}-${secondary.replace("#", "")}-${pattern}`;

  // Jacket silhouette path: torso + sleeves
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`Racing silks: ${pattern} ${primary}/${secondary}`}
    >
      <defs>
        {pattern === "stripes" && (
          <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill={primary} />
            <rect width="3" height="6" fill={secondary} />
          </pattern>
        )}
        {pattern === "hoops" && (
          <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill={primary} />
            <rect width="6" height="3" fill={secondary} />
          </pattern>
        )}
      </defs>

      {/* Sleeves (drawn first, behind torso) */}
      <path
        d="M8 24 L4 44 L14 46 L18 28 Z"
        fill={secondary}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.6"
      />
      <path
        d="M56 24 L60 44 L50 46 L46 28 Z"
        fill={secondary}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.6"
      />

      {/* Torso base */}
      <path
        d="M18 18 Q24 12 32 12 Q40 12 46 18 L48 50 Q40 54 32 54 Q24 54 16 50 Z"
        fill={pattern === "stripes" || pattern === "hoops" ? `url(#${id})` : primary}
        stroke="rgba(0,0,0,0.3)"
        strokeWidth="0.8"
      />

      {/* Pattern overlays on torso */}
      {pattern === "halves" && (
        <path d="M32 12 Q40 12 46 18 L48 50 Q40 54 32 54 Z" fill={secondary} />
      )}
      {pattern === "quarters" && (
        <>
          <path d="M32 12 Q40 12 46 18 L47 33 L32 33 Z" fill={secondary} />
          <path d="M17 33 L32 33 L32 54 Q24 54 16 50 Z" fill={secondary} />
        </>
      )}
      {pattern === "chevron" && (
        <path d="M18 28 L32 38 L46 28 L46 36 L32 46 L18 36 Z" fill={secondary} />
      )}
      {pattern === "sash" && <path d="M18 22 L46 36 L46 42 L18 28 Z" fill={secondary} />}
      {pattern === "diamond" && <path d="M32 20 L42 33 L32 46 L22 33 Z" fill={secondary} />}
      {pattern === "star" && (
        <path
          d="M32 20 L34 28 L42 28 L36 33 L38 41 L32 36 L26 41 L28 33 L22 28 L30 28 Z"
          fill={secondary}
        />
      )}

      {/* Collar */}
      <path d="M28 12 Q32 14 36 12 L36 17 Q32 19 28 17 Z" fill="rgba(0,0,0,0.35)" />

      {/* Cap */}
      {showCap && (
        <g>
          <ellipse
            cx="32"
            cy="9"
            rx="9"
            ry="6"
            fill={cap}
            stroke="rgba(0,0,0,0.3)"
            strokeWidth="0.6"
          />
          <path d="M23 9 Q32 11 41 9 L41 11 Q32 13 23 11 Z" fill="rgba(0,0,0,0.2)" />
        </g>
      )}
    </svg>
  );
}
