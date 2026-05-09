import type { Jockey } from "@/game/types";

interface Props {
  jockey: Pick<Jockey, "id" | "silk" | "age" | "archetype">;
  size?: number;
  className?: string;
}

// Deterministic 32-bit hash from string
function hash(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function pick<T>(arr: readonly T[], n: number): T {
  return arr[n % arr.length];
}

const SKIN_TONES = [
  "#f4d4b0",
  "#e8b890",
  "#d49a6a",
  "#b07a4a",
  "#8b5a32",
  "#5d3a1f",
  "#f1c9a5",
  "#c98e63",
];

const HAIR_COLORS = [
  "#1a1a1a",
  "#3b2410",
  "#5a3a1c",
  "#8a5a2b",
  "#b8823a",
  "#d9a441",
  "#6b6b6b",
  "#2a2a2a",
  "#1f0f08",
];

const EYE_COLORS = ["#3a2a14", "#1a1a1a", "#2c5a3a", "#2a4a7a", "#5a3a1c"];

// Brow / hair styles: 0 short, 1 wavy, 2 receding, 3 sideburns, 4 buzz, 5 messy
type FaceShape = "round" | "oval" | "square";

export function JockeyPortrait({ jockey, size = 80, className }: Props) {
  const seed = hash(jockey.id || "anon");
  const r = (offset: number) => ((seed >>> offset) & 0xff) / 255;

  const skin = pick(SKIN_TONES, seed);
  const hair = pick(HAIR_COLORS, seed >>> 3);
  const eyeColor = pick(EYE_COLORS, seed >>> 6);
  const hairStyle = (seed >>> 9) % 6;
  const faceShape: FaceShape = pick(["round", "oval", "square"] as const, seed >>> 12);
  const hasStubble = r(15) > 0.7;
  const hasMustache = r(17) > 0.85;
  const smile = r(19) > 0.35;
  const noseStyle = (seed >>> 21) % 3;
  const browThickness = 1 + Math.round(r(23) * 1.5);
  const eyeWidth = 3 + Math.round(r(25) * 1.5);
  const earSize = 2.5 + r(27) * 1.5;

  const cap = jockey.silk?.cap ?? "#dc2626";
  const primary = jockey.silk?.primary ?? "#dc2626";
  const secondary = jockey.silk?.secondary ?? "#ffffff";

  const stroke = "rgba(0,0,0,0.55)";
  const strokeW = 0.8;

  // Face path by shape
  const facePath =
    faceShape === "round"
      ? "M30 52 Q30 78 50 82 Q70 78 70 52 Q70 38 50 36 Q30 38 30 52 Z"
      : faceShape === "oval"
        ? "M32 50 Q32 80 50 84 Q68 80 68 50 Q68 36 50 34 Q32 36 32 50 Z"
        : "M30 50 Q30 80 38 82 L62 82 Q70 80 70 50 Q70 36 50 36 Q30 36 30 50 Z";

  // Collar curve
  const collarY = 96;

  return (
    <svg
      viewBox="0 0 100 120"
      width={size}
      height={size * 1.2}
      className={className}
      role="img"
      aria-label="Jockey portrait"
    >
      {/* Background subtle */}
      <rect x="0" y="0" width="100" height="120" fill="transparent" />

      {/* Neck */}
      <path d={`M42 78 L42 92 L58 92 L58 78 Z`} fill={skin} stroke={stroke} strokeWidth={strokeW} />
      <path
        d={`M42 88 Q50 92 58 88`}
        fill="none"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth={strokeW}
      />

      {/* Jacket collar */}
      <path
        d={`M10 ${collarY + 18} Q10 ${collarY - 2} 30 ${collarY - 4} L42 92 L50 100 L58 92 L70 ${collarY - 4} Q90 ${collarY - 2} 90 ${collarY + 18} Z`}
        fill={primary}
        stroke={stroke}
        strokeWidth={strokeW}
      />
      {/* Collar accent stripe */}
      <path
        d={`M30 ${collarY - 4} L42 92 L50 100 L58 92 L70 ${collarY - 4}`}
        fill="none"
        stroke={secondary}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />

      {/* Ears */}
      <ellipse cx="29" cy="58" rx={earSize} ry={earSize + 1.5} fill={skin} stroke={stroke} strokeWidth={strokeW} />
      <ellipse cx="71" cy="58" rx={earSize} ry={earSize + 1.5} fill={skin} stroke={stroke} strokeWidth={strokeW} />

      {/* Face */}
      <path d={facePath} fill={skin} stroke={stroke} strokeWidth={strokeW} />

      {/* Sideburns / hair beneath helmet line */}
      {(hairStyle === 1 || hairStyle === 3 || hairStyle === 5) && (
        <>
          <path d="M30 50 Q28 60 32 64 L36 56 Z" fill={hair} />
          <path d="M70 50 Q72 60 68 64 L64 56 Z" fill={hair} />
        </>
      )}

      {/* Hair peeking under cap (front fringe) */}
      {hairStyle !== 4 && hairStyle !== 2 && (
        <path
          d={
            hairStyle === 1
              ? "M34 44 Q42 40 50 44 Q58 40 66 44 L66 48 Q50 46 34 48 Z"
              : "M34 44 Q50 41 66 44 L66 48 Q50 46 34 48 Z"
          }
          fill={hair}
        />
      )}

      {/* Eyebrows */}
      <rect x={38} y={54} width={eyeWidth + 4} height={browThickness} rx={1} fill={hair} />
      <rect x={58 - (eyeWidth + 4 - 6)} y={54} width={eyeWidth + 4} height={browThickness} rx={1} fill={hair} />

      {/* Eyes */}
      <ellipse cx={42} cy={60} rx={eyeWidth} ry={2} fill="#fff" stroke={stroke} strokeWidth={0.5} />
      <ellipse cx={58} cy={60} rx={eyeWidth} ry={2} fill="#fff" stroke={stroke} strokeWidth={0.5} />
      <circle cx={42} cy={60} r={1.4} fill={eyeColor} />
      <circle cx={58} cy={60} r={1.4} fill={eyeColor} />
      <circle cx={42.4} cy={59.6} r={0.4} fill="#fff" />
      <circle cx={58.4} cy={59.6} r={0.4} fill="#fff" />

      {/* Nose */}
      {noseStyle === 0 && (
        <path d="M50 62 Q48 68 50 71 Q52 68 50 62" fill="none" stroke={stroke} strokeWidth={0.6} />
      )}
      {noseStyle === 1 && (
        <path d="M49 63 L47 70 Q50 72 53 70 L51 63" fill="none" stroke={stroke} strokeWidth={0.7} />
      )}
      {noseStyle === 2 && (
        <path d="M50 63 Q47 69 50 72 Q53 69 50 63" fill="none" stroke={stroke} strokeWidth={0.7} />
      )}

      {/* Mustache */}
      {hasMustache && (
        <path d="M44 75 Q50 77 56 75 Q56 73 50 74 Q44 73 44 75" fill={hair} />
      )}

      {/* Stubble */}
      {hasStubble && (
        <g opacity="0.25">
          <circle cx="40" cy="76" r="0.5" fill={hair} />
          <circle cx="44" cy="78" r="0.5" fill={hair} />
          <circle cx="48" cy="79" r="0.5" fill={hair} />
          <circle cx="52" cy="79" r="0.5" fill={hair} />
          <circle cx="56" cy="78" r="0.5" fill={hair} />
          <circle cx="60" cy="76" r="0.5" fill={hair} />
        </g>
      )}

      {/* Mouth */}
      {smile ? (
        <path d={`M44 78 Q50 ${hasMustache ? 81 : 82} 56 78`} fill="none" stroke={stroke} strokeWidth={0.8} strokeLinecap="round" />
      ) : (
        <path d={`M44 79 L56 79`} fill="none" stroke={stroke} strokeWidth={0.8} strokeLinecap="round" />
      )}

      {/* Helmet (silk cap) */}
      {/* Helmet shell */}
      <path
        d="M22 48 Q22 24 50 22 Q78 24 78 48 Q78 50 76 50 L24 50 Q22 50 22 48 Z"
        fill={cap}
        stroke={stroke}
        strokeWidth={strokeW}
      />
      {/* Helmet peak/visor */}
      <path
        d="M20 48 Q50 54 80 48 L78 51 Q50 56 22 51 Z"
        fill={cap}
        stroke={stroke}
        strokeWidth={strokeW}
      />
      {/* Helmet accent: secondary stripe */}
      <path d="M30 30 Q50 26 70 30 L70 34 Q50 30 30 34 Z" fill={secondary} opacity="0.85" />
      {/* Helmet button */}
      <circle cx="50" cy="24" r="1.6" fill={secondary} stroke={stroke} strokeWidth={0.4} />
      {/* Helmet shine */}
      <path d="M30 28 Q35 24 44 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1.4} strokeLinecap="round" />

      {/* Goggles strap across helmet */}
      <rect x="22" y="44" width="56" height="3" fill="rgba(0,0,0,0.6)" />
      {/* Goggles lenses on visor edge */}
      <ellipse cx="40" cy="49.5" rx="6" ry="3" fill="rgba(80,140,180,0.55)" stroke={stroke} strokeWidth={0.6} />
      <ellipse cx="60" cy="49.5" rx="6" ry="3" fill="rgba(80,140,180,0.55)" stroke={stroke} strokeWidth={0.6} />
      <line x1="46" y1="49.5" x2="54" y2="49.5" stroke="rgba(0,0,0,0.6)" strokeWidth="1" />

      {/* Chin strap */}
      <path d={`M30 50 Q34 78 46 82`} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={0.9} />
      <path d={`M70 50 Q66 78 54 82`} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={0.9} />
    </svg>
  );
}
