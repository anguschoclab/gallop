import type { JockeySilk } from "@/game/types";

interface Props {
  silk: JockeySilk;
  size?: number;
  className?: string;
}

export function SilkPreview({ silk, size = 96, className }: Props) {
  const { primary, secondary, cap, pattern } = silk;
  const stroke = "rgba(0,0,0,0.35)";

  return (
    <svg
      viewBox="0 0 100 110"
      width={size}
      height={size * 1.1}
      className={className}
      role="img"
      aria-label={`Silks: ${pattern}, primary ${primary}, secondary ${secondary}, cap ${cap}`}
    >
      <defs>
        <clipPath id="jacket-clip">
          <path d="M20 35 L35 25 L50 30 L65 25 L80 35 L80 95 L20 95 Z" />
        </clipPath>
      </defs>

      {/* Jacket base */}
      <path d="M20 35 L35 25 L50 30 L65 25 L80 35 L80 95 L20 95 Z" fill={primary} stroke={stroke} />

      {/* Pattern overlay, clipped to jacket */}
      <g clipPath="url(#jacket-clip)">
        {pattern === "stripes" && (
          <>
            <rect x="32" y="25" width="6" height="80" fill={secondary} />
            <rect x="48" y="25" width="6" height="80" fill={secondary} />
            <rect x="64" y="25" width="6" height="80" fill={secondary} />
          </>
        )}
        {pattern === "halves" && <rect x="50" y="20" width="40" height="80" fill={secondary} />}
        {pattern === "quarters" && (
          <>
            <rect x="50" y="20" width="40" height="40" fill={secondary} />
            <rect x="10" y="60" width="40" height="40" fill={secondary} />
          </>
        )}
        {pattern === "chevron" && (
          <polygon points="20,95 50,55 80,95 80,75 50,35 20,75" fill={secondary} />
        )}
        {pattern === "diamond" && <polygon points="50,40 75,65 50,90 25,65" fill={secondary} />}
        {pattern === "star" && (
          <polygon
            points="50,42 55,58 72,58 58,68 63,84 50,74 37,84 42,68 28,58 45,58"
            fill={secondary}
          />
        )}
        {pattern === "sash" && <polygon points="20,40 80,75 80,90 20,55" fill={secondary} />}
        {pattern === "hoops" && (
          <>
            <rect x="20" y="48" width="60" height="6" fill={secondary} />
            <rect x="20" y="62" width="60" height="6" fill={secondary} />
            <rect x="20" y="76" width="60" height="6" fill={secondary} />
          </>
        )}
        {/* "solid" intentionally renders nothing on top of the primary */}
      </g>

      {/* Sleeves */}
      <path d="M10 40 L20 35 L25 75 L15 80 Z" fill={primary} stroke={stroke} />
      <path d="M90 40 L80 35 L75 75 L85 80 Z" fill={primary} stroke={stroke} />

      {/* Cap */}
      <ellipse cx="50" cy="20" rx="14" ry="10" fill={cap} stroke={stroke} />
      <rect x="36" y="18" width="28" height="4" fill={cap} stroke={stroke} />
    </svg>
  );
}
