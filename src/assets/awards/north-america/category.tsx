// North America - Eclipse Award - Generic Category Trophy
// Deep Blue + Gold color scheme

export const categoryColor = "#1E3A5F";
export const categoryAccent = "#C0C0C0";

export const CategoryIcon = ({
  width = 48,
  height = 48,
  className = "",
}: {
  width?: number | string;
  height?: number | string;
  className?: string;
}) => (
  <svg
    className={className}
    width={width}
    height={height}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Category Champion - Eclipse Award</title>
    {/* Background circle - Deep Blue */}
    <circle cx="24" cy="24" r="22" fill="url(#na-cat-bg)" stroke="#4A90A4" strokeWidth="2" />

    {/* Trophy cup - Silver variant */}
    <path
      d="M16 14 L16 20 C16 26 20 30 24 30 C28 30 32 26 32 20 L32 14"
      stroke="#C0C0C0"
      strokeWidth="2"
      fill="none"
    />
    <path d="M14 14 L34 14" stroke="#C0C0C0" strokeWidth="2" />
    <path
      d="M18 14 L18 12 C18 11 19 10 20 10 L28 10 C29 10 30 11 30 12 L30 14"
      stroke="#C0C0C0"
      strokeWidth="2"
      fill="none"
    />

    {/* Handles */}
    <path d="M16 16 C12 16 12 22 16 22" stroke="#C0C0C0" strokeWidth="2" fill="none" />
    <path d="M32 16 C36 16 36 22 32 22" stroke="#C0C0C0" strokeWidth="2" fill="none" />

    {/* Base */}
    <rect x="20" y="30" width="8" height="4" fill="#C0C0C0" />
    <rect x="18" y="34" width="12" height="2" fill="#C0C0C0" />

    {/* Star accent */}
    <circle cx="36" cy="12" r="4" fill="#C9A227" />
    <path
      d="M36 9 L37 11 L39 11 L37.5 12.5 L38 14.5 L36 13.5 L34 14.5 L34.5 12.5 L33 11 L35 11 Z"
      fill="#1E3A5F"
    />

    <defs>
      <linearGradient id="na-cat-bg" x1="0" y1="0" x2="48" y2="48">
        <stop offset="0%" stopColor="#1E3A5F" />
        <stop offset="100%" stopColor="#0D2137" />
      </linearGradient>
    </defs>
  </svg>
);
