import { useMemo } from "react";
import { useGame } from "@/game/store";
import type { StaffMember, StaffRole } from "@/core/staff/staffTypes";

/**
 * Props for the StaffSupportPanel component.
 */
interface StaffSupportPanelProps {
  /** The stable ID to check for hired staff. */
  stableId: string;
}

/**
 * Component to display active staff bonuses for a stable.
 *
 * EXTRACTED FROM: src/routes/stable.$horseId.tsx
 */
export function StaffSupportPanel({ stableId }: StaffSupportPanelProps) {
  const hiredStaff = useGame((s) => s.hiredStaff);
  // ⚡ Bolt Optimization:
  // Calculate filter and hash map in a single pass to avoid unstable array reference on every render
  // Impact: Reduces rendering complexity from O(N_filter + 5*N_find) to O(N_filter) with stable memoization
  const staffRoleMap = useMemo(() => {
    const map = new Map<StaffRole, StaffMember>();
    if (!hiredStaff) return map;
    for (let i = 0; i < hiredStaff.length; i++) {
      const s = hiredStaff[i];
      if (s.stableId === stableId) {
        map.set(s.role, s);
      }
    }
    return map;
  }, [hiredStaff, stableId]);

  const nutritionist = staffRoleMap.get("nutritionist");
  const vet = staffRoleMap.get("veterinarian");
  const trainer = staffRoleMap.get("trainer");
  const farrier = staffRoleMap.get("farrier");
  const groom = staffRoleMap.get("groom");

  const bonuses = [
    nutritionist && {
      label: "Nutritionist",
      value: `+${Math.round(nutritionist.bonusValue * 100)}% Energy`,
    },
    vet && { label: "Veterinarian", value: `+${Math.round(vet.bonusValue * 100)}% Recovery` },
    trainer && { label: "Trainer", value: `+${Math.round(trainer.bonusValue * 100)}% Efficiency` },
    farrier && { label: "Farrier", value: `+${Math.round(farrier.bonusValue * 100)}% Aptitude` },
    groom && { label: "Groom", value: `+${Math.round(groom.bonusValue * 100)}% Form` },
  ].filter(Boolean) as { label: string; value: string }[];

  if (bonuses.length === 0) {
    return (
      <p className="text-[10px] text-cream-muted italic">No specialized staff support active.</p>
    );
  }

  return (
    <div className="space-y-1">
      {bonuses.map((b) => (
        <div key={b.label} className="flex justify-between text-[10px]">
          <span className="text-cream-muted">{b.label}</span>
          <span className="text-success font-medium">{b.value}</span>
        </div>
      ))}
    </div>
  );
}
