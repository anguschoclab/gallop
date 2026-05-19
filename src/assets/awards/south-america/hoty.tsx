import { useId } from "react";

// South America - Gran Premio Award - Horse of the Year
// Red + Gold color scheme with Laurel wreath accent

interface SvgProps {
  width: number;
  height: number;
  className?: string;
}

export const HotyIcon = ({ width, height, className }: SvgProps) => {
  const id = useId();
  const gradientId = `sa-bg-${id}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <title>Horse of the Year - Gran Premio</title>
      {/* Background circle - Red */}
      <circle
        cx="24"
        cy="24"
        r="22"
        fill={`url(#${gradientId})`}
        stroke="#FFD700"
        strokeWidth="2"
      />

      {/* Laurel wreath top */}
      <ellipse cx="24" cy="10" rx="10" ry="4" fill="none" stroke="#FFD700" strokeWidth="1.5" />
      <path d="M16 10 Q20 6 24 10 Q28 6 32 10" stroke="#FFD700" strokeWidth="1" fill="none" />

      {/* Ornate chalice trophy */}
      <path
        d="M16 16 C16 24 20 28 24 28 C28 28 32 24 32 16"
        stroke="#FFD700"
        strokeWidth="2"
        fill="none"
      />
      <path d="M14 16 L34 16" stroke="#FFD700" strokeWidth="2" />
      <path
        d="M20 16 L20 12 C20 11 22 10 24 10 C26 10 28 11 28 12 L28 16"
        stroke="#FFD700"
        strokeWidth="2"
        fill="none"
      />

      {/* Ornate handles */}
      <path d="M16 18 C10 20 10 26 16 24" stroke="#FFD700" strokeWidth="2" fill="none" />
      <path d="M32 18 C38 20 38 26 32 24" stroke="#FFD700" strokeWidth="2" fill="none" />

      {/* Ornate base */}
      <path d="M20 28 L18 36 L30 36 L28 28 Z" fill="#FFD700" />
      <circle cx="24" cy="38" r="3" fill="#FFD700" />

      {/* Year banner */}
      <rect x="19" y="39" width="10" height="4" rx="1" fill="#8B0000" />
      <text x="24" y="42" fontSize="3" fill="#FFD700" textAnchor="middle" fontWeight="bold">
        HOTY
      </text>

      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#8B0000" />
          <stop offset="100%" stopColor="#5C0000" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export const hotyColor = "#8B0000";
export const hotyAccent = "#FFD700";
