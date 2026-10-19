/**
 * person/ui/PersonPortrait.tsx - Deterministic SVG compositor for person identities
 *
 * Renders a PersonIdentity as a procedural SVG portrait. Context changes wardrobe
 * framing but never the underlying face/body DNA.
 */

import type { PersonIdentity, PortraitContext } from "@/domains/person/model/types";
import { resolvePersonRenderPlan } from "@/domains/person/application/renderPlan";
import {
  getFacePath,
  getSkinTone,
  getHairColor,
  getEyeColor,
} from "@/domains/person/ui/portrait-assets/manifest";

interface PersonPortraitProps {
  identity: PersonIdentity;
  context?: PortraitContext;
  width?: number;
  height?: number;
  silk?: { primary: string; secondary: string; cap: string; pattern: string } | null;
  className?: string;
  ariaLabel?: string;
  decorative?: boolean;
}

export function PersonPortrait({
  identity,
  context = "owner-formal",
  width = 100,
  height = 120,
  silk,
  className,
  ariaLabel,
  decorative = false,
}: PersonPortraitProps) {
  const w = width;
  const h = height;
  const a = identity.appearance;
  const skin = getSkinTone(a.skinToneId);
  const hair = getHairColor(a.hairColorId);
  const eye = getEyeColor(a.eyeColorId);
  const facePath = getFacePath(a.faceBaseId, w, h);

  const racewear = context === "jockey-racewear" || context === "jockey-casual";
  const capColor = silk?.cap ?? "#dc2626";
  const primary = silk?.primary ?? "#dc2626";
  const secondary = silk?.secondary ?? "#ffffff";
  const stroke = "rgba(0,0,0,0.55)";

  // Deterministic pseudo-random positions derived from seed.
  const seed = a.seed;
  const n = (offset: number) => ((seed >>> offset) & 0xffff) / 0xffff;

  // Eye placement
  const eyeY = h * (0.4 + n(0) * 0.02 - 0.01);
  const leftEyeX = w * (0.38 + n(1) * 0.02);
  const rightEyeX = w * (0.62 - n(1) * 0.02);
  const eyeSize = Math.max(2, w * (0.035 + n(2) * 0.01));

  // Brow
  const browY = eyeY - h * (0.05 + n(3) * 0.02);
  const browThick = 1 + Math.round(n(4) * 2);

  // Nose
  const noseX = w * 0.5;
  const noseY = h * (0.48 + n(5) * 0.03);
  const noseW = w * (0.08 + n(6) * 0.03);
  const noseH = h * (0.1 + n(7) * 0.03);

  // Mouth
  const mouthY = h * (0.62 + n(8) * 0.03);
  const mouthW = w * (0.18 + n(9) * 0.05);

  // Hair silhouette using simple arcs
  const hairStyle = a.hairId;
  const hairTopY = h * (0.12 + n(10) * 0.04);
  const hairWidth = w * (0.5 + n(11) * 0.08);

  const headwear = a.headwearId;
  const eyewear = a.eyewearId;
  const facialHair = a.facialHairId;

  const plan = resolvePersonRenderPlan({
    identity,
    context,
    width: w,
    height: h,
    silk,
    label: ariaLabel,
  });
  const label = plan.label;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      className={className}
      role="img"
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative}
    >
      {/* Background */}
      <rect x="0" y="0" width={w} height={h} fill="transparent" />

      {/* Body/shoulders */}
      <path
        d={`M${w * 0.15},${h} Q${w * 0.25},${h * 0.72} ${w * 0.5},${h * 0.72} Q${w * 0.75},${h * 0.72} ${w * 0.85},${h} Z`}
        fill={racewear ? primary : "#1f2937"}
        stroke={stroke}
        strokeWidth={0.8}
      />
      {racewear && (
        <path
          d={`M${w * 0.25},${h * 0.78} L${w * 0.5},${h * 0.88} L${w * 0.75},${h * 0.78}`}
          fill="none"
          stroke={secondary}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      )}

      {/* Neck */}
      <path
        d={`M${w * 0.4},${h * 0.55} L${w * 0.4},${h * 0.75} L${w * 0.6},${h * 0.75} L${w * 0.6},${h * 0.55} Z`}
        fill={skin}
        stroke={stroke}
        strokeWidth={0.8}
      />

      {/* Face */}
      <path d={facePath} fill={skin} stroke={stroke} strokeWidth={0.8} />

      {/* Hair back */}
      <path
        d={`M${w * 0.5},${hairTopY} C${w * 0.5 - hairWidth / 2},${hairTopY} ${w * 0.25},${h * 0.35} ${w * 0.28},${h * 0.55} C${w * 0.3},${h * 0.45} ${w * 0.35},${h * 0.25} ${w * 0.5},${h * 0.22} C${w * 0.65},${h * 0.25} ${w * 0.7},${h * 0.45} ${w * 0.72},${h * 0.55} C${w * 0.75},${h * 0.35} ${w * 0.5 + hairWidth / 2},${hairTopY} ${w * 0.5},${hairTopY} Z`}
        fill={hair}
        stroke={stroke}
        strokeWidth={0.6}
      />

      {/* Ears */}
      <ellipse
        cx={w * 0.26}
        cy={h * 0.42}
        rx={w * 0.03}
        ry={h * 0.045}
        fill={skin}
        stroke={stroke}
        strokeWidth={0.6}
      />
      <ellipse
        cx={w * 0.74}
        cy={h * 0.42}
        rx={w * 0.03}
        ry={h * 0.045}
        fill={skin}
        stroke={stroke}
        strokeWidth={0.6}
      />

      {/* Eyes */}
      <ellipse cx={leftEyeX} cy={eyeY} rx={eyeSize} ry={eyeSize * 0.75} fill={eye} />
      <ellipse cx={rightEyeX} cy={eyeY} rx={eyeSize} ry={eyeSize * 0.75} fill={eye} />
      <circle cx={leftEyeX + 1} cy={eyeY - 1} r={eyeSize * 0.25} fill="#ffffff" opacity={0.6} />
      <circle cx={rightEyeX + 1} cy={eyeY - 1} r={eyeSize * 0.25} fill="#ffffff" opacity={0.6} />

      {/* Brows */}
      <path
        d={`M${leftEyeX - eyeSize * 1.5},${browY} Q${leftEyeX},${browY - browThick} ${leftEyeX + eyeSize * 1.5},${browY}`}
        fill="none"
        stroke={hair}
        strokeWidth={browThick}
        strokeLinecap="round"
      />
      <path
        d={`M${rightEyeX - eyeSize * 1.5},${browY} Q${rightEyeX},${browY - browThick} ${rightEyeX + eyeSize * 1.5},${browY}`}
        fill="none"
        stroke={hair}
        strokeWidth={browThick}
        strokeLinecap="round"
      />

      {/* Nose */}
      <path
        d={`M${noseX},${noseY - noseH * 0.3} Q${noseX - noseW},${noseY} ${noseX},${noseY + noseH * 0.5} Q${noseX + noseW},${noseY} ${noseX},${noseY - noseH * 0.3}`}
        fill="rgba(0,0,0,0.12)"
        stroke={stroke}
        strokeWidth={0.6}
      />

      {/* Mouth */}
      <path
        d={`M${w * 0.5 - mouthW / 2},${mouthY} Q${w * 0.5},${mouthY + h * 0.02} ${w * 0.5 + mouthW / 2},${mouthY}`}
        fill="none"
        stroke="#7a3e3e"
        strokeWidth={1.5}
        strokeLinecap="round"
      />

      {/* Facial hair */}
      {facialHair && facialHair !== "none" && (
        <g opacity={0.85}>
          {facialHair === "stubble" && (
            <path
              d={`M${w * 0.32},${h * 0.52} L${w * 0.68},${h * 0.52} L${w * 0.66},${h * 0.7} L${w * 0.34},${h * 0.7} Z`}
              fill="rgba(0,0,0,0.18)"
              stroke="none"
            />
          )}
          {facialHair === "moustache" && (
            <path
              d={`M${w * 0.42},${mouthY - h * 0.015} Q${w * 0.5},${mouthY - h * 0.01} ${w * 0.58},${mouthY - h * 0.015} Q${w * 0.5},${mouthY + h * 0.005} ${w * 0.42},${mouthY - h * 0.015}`}
              fill={hair}
            />
          )}
          {(facialHair === "goatee" || facialHair === "full-beard") && (
            <path
              d={`M${w * 0.38},${mouthY + h * 0.01} Q${w * 0.5},${h * 0.72} ${w * 0.62},${mouthY + h * 0.01} Z`}
              fill={hair}
              opacity={0.9}
            />
          )}
          {facialHair === "sideburns" && (
            <>
              <path
                d={`M${w * 0.29},${h * 0.35} L${w * 0.31},${h * 0.52} L${w * 0.28},${h * 0.52} Z`}
                fill={hair}
              />
              <path
                d={`M${w * 0.71},${h * 0.35} L${w * 0.69},${h * 0.52} L${w * 0.72},${h * 0.52} Z`}
                fill={hair}
              />
            </>
          )}
        </g>
      )}

      {/* Eyewear */}
      {eyewear && eyewear !== "none" && (
        <g stroke="#1f2937" strokeWidth={1.2} fill="rgba(255,255,255,0.2)">
          <circle cx={leftEyeX} cy={eyeY} r={eyeSize * 1.6} />
          <circle cx={rightEyeX} cy={eyeY} r={eyeSize * 1.6} />
          <line x1={leftEyeX + eyeSize * 1.6} y1={eyeY} x2={rightEyeX - eyeSize * 1.6} y2={eyeY} />
        </g>
      )}

      {/* Headwear */}
      {headwear && headwear !== "none" && (
        <g>
          {headwear === "cap" && (
            <>
              <ellipse
                cx={w * 0.5}
                cy={h * 0.18}
                rx={w * 0.24}
                ry={h * 0.08}
                fill={capColor}
                stroke={stroke}
                strokeWidth={0.8}
              />
              <path
                d={`M${w * 0.26},${h * 0.18} L${w * 0.74},${h * 0.18} L${w * 0.72},${h * 0.08} L${w * 0.28},${h * 0.08} Z`}
                fill={capColor}
                stroke={stroke}
                strokeWidth={0.8}
              />
              <path
                d={`M${w * 0.74},${h * 0.18} L${w * 0.85},${h * 0.21} L${w * 0.74},${h * 0.24} Z`}
                fill={capColor}
                stroke={stroke}
                strokeWidth={0.6}
              />
            </>
          )}
          {headwear !== "cap" && (
            <ellipse
              cx={w * 0.5}
              cy={h * 0.16}
              rx={w * 0.22}
              ry={h * 0.06}
              fill="#374151"
              stroke={stroke}
              strokeWidth={0.8}
            />
          )}
        </g>
      )}

      {/* Age overlay */}
      {a.ageOverlayId && a.ageOverlayId !== "none" && (
        <path
          d={facePath}
          fill="rgba(255,255,255,0.06)"
          stroke="rgba(0,0,0,0.1)"
          strokeWidth={0.5}
        />
      )}

      {/* Context framing border */}
      {context === "compact" && (
        <rect
          x="1"
          y="1"
          width={w - 2}
          height={h - 2}
          rx={4}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={1}
        />
      )}
    </svg>
  );
}
