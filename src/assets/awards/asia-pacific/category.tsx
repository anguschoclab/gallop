import { useId } from "react";

// Asia-Pacific - Australian Thoroughbred Award - Generic Category
// Emerald Green + Gold color scheme

interface SvgProps {
  width: number;
  height: number;
  className?: string;
}

export const CategoryIcon = ({ width, height, className }: SvgProps) => {
  const id = useId();
  const gradientId = `apac-cat-bg-${id}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <title>Category Champion - Australian Award</title>
      {/* Background circle - Emerald Green */}
      <circle
        cx="24"
        cy="24"
        r="22"
        fill={`url(#${gradientId})`}
        stroke="#32CD32"
        strokeWidth="2"
      />

      {/* Modern trophy */}
      <path
        d="M15 16 L17 27 L24 31 L31 27 L33 16 Z"
        stroke="#FFD700"
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M13 16 L35 16" stroke="#FFD700" strokeWidth="1.5" />

      {/* Angular handles */}
      <path
        d="M15 18 L11 22 L15 26"
        stroke="#FFD700"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M33 18 L37 22 L33 26"
        stroke="#FFD700"
        strokeWidth="1.5"
        fill="none"
      />

      {/* Base */}
      <path d="M20 31 L18 37 L30 37 L28 31 Z" fill="#FFD700" opacity="0.8" />

      {/* Sun accent */}
      <circle cx="36" cy="12" r="4" fill="#FFD700" />
      <circle cx="36" cy="12" r="2" fill="#006400" />

      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#006400" />
          <stop offset="100%" stopColor="#004d00" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export const categoryColor = "#006400";
export const categoryAccent = "#FFD700";
