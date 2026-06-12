/**
 * FaceFeatures.tsx - SVG face rendering for jockey portraits
 *
 * Extracted from JockeyPortrait.tsx.
 */

interface FaceFeaturesProps {
  skin: string;
  hair: string;
  eyeColor: string;
  hairStyle: number;
  faceShape: "round" | "oval" | "square";
  hasStubble: boolean;
  hasMustache: boolean;
  smile: boolean;
  noseStyle: number;
  browThickness: number;
  eyeWidth: number;
  earSize: number;
  stroke: string;
  strokeW: number;
}

export function FaceFeatures({
  skin,
  hair,
  eyeColor,
  hairStyle,
  faceShape,
  hasStubble,
  hasMustache,
  smile,
  noseStyle,
  browThickness,
  eyeWidth,
  earSize,
  stroke,
  strokeW,
}: FaceFeaturesProps) {
  const facePath =
    faceShape === "round"
      ? "M30 52 Q30 78 50 82 Q70 78 70 52 Q70 38 50 36 Q30 38 30 52 Z"
      : faceShape === "oval"
        ? "M32 50 Q32 80 50 84 Q68 80 68 50 Q68 36 50 34 Q32 36 32 50 Z"
        : "M30 50 Q30 80 38 82 L62 82 Q70 80 70 50 Q70 36 50 36 Q30 36 30 50 Z";

  return (
    <g>
      {/* Ears */}
      <ellipse
        cx="29"
        cy="58"
        rx={earSize}
        ry={earSize + 1.5}
        fill={skin}
        stroke={stroke}
        strokeWidth={strokeW}
      />
      <ellipse
        cx="71"
        cy="58"
        rx={earSize}
        ry={earSize + 1.5}
        fill={skin}
        stroke={stroke}
        strokeWidth={strokeW}
      />

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
      <rect
        x={58 - (eyeWidth + 4 - 6)}
        y={54}
        width={eyeWidth + 4}
        height={browThickness}
        rx={1}
        fill={hair}
      />

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
      {hasMustache && <path d="M44 75 Q50 77 56 75 Q56 73 50 74 Q44 73 44 75" fill={hair} />}

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
        <path
          d={`M44 78 Q50 ${hasMustache ? 81 : 82} 56 78`}
          fill="none"
          stroke={stroke}
          strokeWidth={0.8}
          strokeLinecap="round"
        />
      ) : (
        <path
          d={`M44 79 L56 79`}
          fill="none"
          stroke={stroke}
          strokeWidth={0.8}
          strokeLinecap="round"
        />
      )}
    </g>
  );
}
