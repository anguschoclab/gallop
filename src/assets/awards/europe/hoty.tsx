import { useId } from "react";

// Europe - Cartier Racing Award - Horse of the Year
// Royal Purple + Silver color scheme with Crown accent

interface SvgProps {
  width: number;
  height: number;
  className?: string;
}

export const HotyIcon = ({ width, height, className }: SvgProps) => {
  const id = useId();
  const gradientId = `eu-bg-${id}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <title>Horse of the Year - Cartier Award</title>
      {/* Background circle - Royal Purple */}
      <circle
        cx="24"
        cy="24"
        r="22"
        fill={`url(#${gradientId})`}
        stroke="#C0C0C0"
        strokeWidth="2"
      />

      {/* Crown on top */}
      <path d="M18 12 L20 8 L24 10 L28 8 L30 12 L30 14 L18 14 Z" fill="#C0C0C0" />
      <circle cx="20" cy="8" r="1.5" fill="#C0C0C0" />
      <circle cx="24" cy="10" r="1.5" fill="#C0C0C0" />
      <circle cx="28" cy="8" r="1.5" fill="#C0C0C0" />

      {/* Elegant crystal trophy stem */}
      <path
        d="M16 16 L16 24 C16 28 20 32 24 32 C28 32 32 28 32 24 L32 16"
        stroke="#C0C0C0"
        strokeWidth="2"
        fill="none"
      />
      <path d="M14 16 L34 16" stroke="#C0C0C0" strokeWidth="2" />

      {/* Handles - more elegant */}
      <path d="M16 18 C11 18 11 26 16 26" stroke="#C0C0C0" strokeWidth="1.5" fill="none" />
      <path d="M32 18 C37 18 37 26 32 26" stroke="#C0C0C0" strokeWidth="1.5" fill="none" />

      {/* Base - crystal style */}
      <path d="M20 32 L18 38 L30 38 L28 32 Z" fill="#C0C0C0" opacity="0.8" />

      {/* Year banner */}
      <rect x="19" y="39" width="10" height="4" rx="1" fill="#4B0082" />
      <text x="24" y="42" fontSize="3" fill="#C0C0C0" textAnchor="middle" fontWeight="bold">
        HOTY
      </text>

      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#4B0082" />
          <stop offset="100%" stopColor="#2D0052" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export const hotyColor = "#4B0082";
export const hotyAccent = "#C0C0C0";
