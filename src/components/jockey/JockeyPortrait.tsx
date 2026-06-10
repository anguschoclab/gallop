import type { Jockey } from "@/game/types";
import { FaceFeatures } from "./FaceFeatures";
import { JockeyHelmet } from "./JockeyHelmet";

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
      <rect x="0" y="0" width="100" height="120" fill="transparent" />

      {/* Neck */}
      <path d={`M42 78 L42 92 L58 92 L58 78 Z`} fill={skin} stroke={stroke} strokeWidth={strokeW} />
      <path d={`M42 88 Q50 92 58 88`} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={strokeW} />

      {/* Jacket collar */}
      <path
        d={`M10 ${collarY + 18} Q10 ${collarY - 2} 30 ${collarY - 4} L42 92 L50 100 L58 92 L70 ${collarY - 4} Q90 ${collarY - 2} 90 ${collarY + 18} Z`}
        fill={primary}
        stroke={stroke}
        strokeWidth={strokeW}
      />
      <path
        d={`M30 ${collarY - 4} L42 92 L50 100 L58 92 L70 ${collarY - 4}`}
        fill="none"
        stroke={secondary}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />

      <FaceFeatures
        skin={skin}
        hair={hair}
        eyeColor={eyeColor}
        hairStyle={hairStyle}
        faceShape={faceShape}
        hasStubble={hasStubble}
        hasMustache={hasMustache}
        smile={smile}
        noseStyle={noseStyle}
        browThickness={browThickness}
        eyeWidth={eyeWidth}
        earSize={earSize}
        stroke={stroke}
        strokeW={strokeW}
      />

      <JockeyHelmet cap={cap} secondary={secondary} stroke={stroke} strokeW={strokeW} />
    </svg>
  );
}
