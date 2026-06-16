import type { Horse } from "@/core/horse/types";

export interface InheritanceRow {
  key: "speed" | "stamina" | "acceleration" | "consistency";
  label: string;
  foal: number;
  sire: number;
  dam: number;
  /** Which parent the foal's value is closer to, or "transgressive" if it exceeds both. */
  leansToward: "sire" | "dam" | "even" | "transgressive";
}

const STATS: { key: InheritanceRow["key"]; label: string }[] = [
  { key: "speed", label: "Speed" },
  { key: "stamina", label: "Stamina" },
  { key: "acceleration", label: "Acceleration" },
  { key: "consistency", label: "Consistency" },
];

export function deriveFoalInheritance(
  foal: Horse,
  sire: Horse | undefined,
  dam: Horse | undefined,
): InheritanceRow[] {
  if (!sire || !dam) return [];

  return STATS.map(({ key, label }) => {
    const f = (foal.stats[key as keyof typeof foal.stats] as number) ?? 0;
    const s = (sire.stats[key as keyof typeof sire.stats] as number) ?? 0;
    const d = (dam.stats[key as keyof typeof dam.stats] as number) ?? 0;

    let leansToward: InheritanceRow["leansToward"];
    if (f > s && f > d) {
      leansToward = "transgressive";
    } else {
      const dSire = Math.abs(f - s);
      const dDam = Math.abs(f - d);
      if (Math.abs(dSire - dDam) <= 2) leansToward = "even";
      else leansToward = dSire < dDam ? "sire" : "dam";
    }

    return { key, label, foal: f, sire: s, dam: d, leansToward };
  });
}
