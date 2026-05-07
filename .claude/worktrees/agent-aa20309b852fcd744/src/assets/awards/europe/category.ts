// Europe - Cartier Racing Award - Generic Category
// Royal Purple + Silver color scheme

export const categorySvg = `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <title>Category Champion - Cartier Award</title>
  <!-- Background circle - Royal Purple -->
  <circle cx="24" cy="24" r="22" fill="url(#eu-cat-bg)" stroke="#7B68EE" stroke-width="2"/>
  
  <!-- Elegant trophy -->
  <path d="M16 16 L16 24 C16 28 20 32 24 32 C28 32 32 28 32 24 L32 16" 
        stroke="#C0C0C0" stroke-width="1.5" fill="none"/>
  <path d="M14 16 L34 16" stroke="#C0C0C0" stroke-width="1.5"/>
  
  <!-- Handles -->
  <path d="M16 18 C11 18 11 26 16 26" stroke="#C0C0C0" stroke-width="1.5" fill="none"/>
  <path d="M32 18 C37 18 37 26 32 26" stroke="#C0C0C0" stroke-width="1.5" fill="none"/>
  
  <!-- Base -->
  <path d="M20 32 L18 38 L30 38 L28 32 Z" fill="#C0C0C0" opacity="0.6"/>
  
  <!-- Crystal accent -->
  <circle cx="36" cy="12" r="4" fill="#C0C0C0"/>
  <path d="M34 10 L38 14 M38 10 L34 14" stroke="#4B0082" stroke-width="1"/>
  
  <defs>
    <linearGradient id="eu-cat-bg" x1="0" y1="0" x2="48" y2="48">
      <stop offset="0%" stop-color="#4B0082"/>
      <stop offset="100%" stop-color="#2D0052"/>
    </linearGradient>
  </defs>
</svg>`;

export const categoryColor = "#4B0082";
export const categoryAccent = "#C0C0C0";
