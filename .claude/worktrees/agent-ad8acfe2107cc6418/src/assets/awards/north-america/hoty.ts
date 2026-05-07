// North America - Eclipse Award - Horse of the Year
// Deep Blue + Gold color scheme

export const hotySvg = `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <title>Horse of the Year - Eclipse Award</title>
  <!-- Background circle - Deep Blue -->
  <circle cx="24" cy="24" r="22" fill="url(#na-bg)" stroke="#C9A227" stroke-width="2"/>
  
  <!-- Trophy cup -->
  <path d="M16 14 L16 20 C16 26 20 30 24 30 C28 30 32 26 32 20 L32 14" 
        stroke="#C9A227" stroke-width="2" fill="none"/>
  <path d="M14 14 L34 14" stroke="#C9A227" stroke-width="2"/>
  <path d="M18 14 L18 12 C18 11 19 10 20 10 L28 10 C29 10 30 11 30 12 L30 14" 
        stroke="#C9A227" stroke-width="2" fill="none"/>
  
  <!-- Handles -->
  <path d="M16 16 C12 16 12 22 16 22" stroke="#C9A227" stroke-width="2" fill="none"/>
  <path d="M32 16 C36 16 36 22 32 22" stroke="#C9A227" stroke-width="2" fill="none"/>
  
  <!-- Base -->
  <rect x="20" y="30" width="8" height="4" fill="#C9A227"/>
  <rect x="18" y="34" width="12" height="2" fill="#C9A227"/>
  
  <!-- Star on top -->
  <path d="M24 6 L25 9 L28 9 L25.5 11 L26.5 14 L24 12 L21.5 14 L22.5 11 L20 9 L23 9 Z" 
        fill="#C9A227"/>
  
  <!-- Year banner -->
  <rect x="19" y="36" width="10" height="4" rx="1" fill="#1E3A5F"/>
  <text x="24" y="39" font-size="3" fill="#C9A227" text-anchor="middle" font-weight="bold">HOTY</text>
  
  <defs>
    <linearGradient id="na-bg" x1="0" y1="0" x2="48" y2="48">
      <stop offset="0%" stop-color="#1E3A5F"/>
      <stop offset="100%" stop-color="#0D2137"/>
    </linearGradient>
  </defs>
</svg>`;

export const hotyColor = "#1E3A5F";
export const hotyAccent = "#C9A227";
