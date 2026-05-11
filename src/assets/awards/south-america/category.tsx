import { useId } from "react";

// South America - Gran Premio Award - Generic Category
// Red + Gold color scheme

interface SvgProps {
  width: number;
  height: number;
  className?: string;
}

export const CategoryIcon = ({ width, height, className }: SvgProps) => {
  const id = useId();
  const gradientId = `sa-cat-bg-${id}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <title>Category Champion - Gran Premio</title>
      {/* Background circle - Red */}
      <circle
        cx="24"
        cy="24"
        r="22"
        fill={`url(#${gradientId})`}
        stroke="#FF6347"
        strokeWidth="2"
      />

      {/* Chalice trophy */}
      <path
        d="M16 17 C16 25 20 29 24 29 C28 29 32 25 32 17"
        stroke="#FFD700"
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M14 17 L34 17" stroke="#FFD700" strokeWidth="1.5" />

      {/* Handles */}
      <path
        d="M16 19 C11 21 11 26 16 24"
        stroke="#FFD700"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M32 19 C37 21 37 26 32 24"
        stroke="#FFD700"
        strokeWidth="1.5"
        fill="none"
      />

      {/* Base */}
      <path d="M20 29 L18 36 L30 36 L28 29 Z" fill="#FFD700" opacity="0.8" />

      {/* Gold accent */}
      <circle cx="36" cy="12" r="4" fill="#FFD700" />
      <path d="M34 12 L38 12 M36 10 L36 14" stroke="#8B0000" strokeWidth="1" />

      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#8B0000" />
          <stop offset="100%" stopColor="#5C0000" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export const categoryColor = "#8B0000";
export const categoryAccent = "#FFD700";
