import { useId } from "react";

// Asia-Pacific - Australian Thoroughbred Award - Racehorse of the Year
// Emerald Green + Gold color scheme with Sunburst accent

interface SvgProps {
  width: number;
  height: number;
  className?: string;
}

export const HotyIcon = ({ width, height, className }: SvgProps) => {
  const id = useId();
  const gradientId = `apac-bg-${id}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <title>Racehorse of the Year - Australian Award</title>
      {/* Background circle - Emerald Green */}
      <circle
        cx="24"
        cy="24"
        r="22"
        fill={`url(#${gradientId})`}
        stroke="#FFD700"
        strokeWidth="2"
      />

      {/* Sunburst rays */}
      <g stroke="#FFD700" strokeWidth="1" opacity="0.5">
        <line x1="24" y1="4" x2="24" y2="8" />
        <line x1="36" y1="8" x2="33" y2="11" />
        <line x1="44" y1="20" x2="40" y2="21" />
        <line x1="44" y1="28" x2="40" y2="27" />
        <line x1="12" y1="8" x2="15" y2="11" />
        <line x1="4" y1="20" x2="8" y2="21" />
      </g>

      {/* Modern angular trophy */}
      <path d="M15 15 L17 28 L24 32 L31 28 L33 15 Z" stroke="#FFD700" strokeWidth="2" fill="none" />
      <path d="M13 15 L35 15" stroke="#FFD700" strokeWidth="2" />

      {/* Angular handles */}
      <path d="M15 17 L10 22 L15 27" stroke="#FFD700" strokeWidth="2" fill="none" />
      <path d="M33 17 L38 22 L33 27" stroke="#FFD700" strokeWidth="2" fill="none" />

      {/* Base */}
      <path d="M19 32 L17 38 L31 38 L29 32 Z" fill="#FFD700" />

      {/* Year banner */}
      <rect x="19" y="39" width="10" height="4" rx="1" fill="#006400" />
      <text x="24" y="42" fontSize="3" fill="#FFD700" textAnchor="middle" fontWeight="bold">
        HOTY
      </text>

      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#006400" />
          <stop offset="100%" stopColor="#004d00" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export const hotyColor = "#006400";
export const hotyAccent = "#FFD700";
