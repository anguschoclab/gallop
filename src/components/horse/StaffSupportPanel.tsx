import { useGame } from "@/game/store";

/**
 * Props for the StaffSupportPanel component.
 */
interface StaffSupportPanelProps {
  /** The stable ID to check for hired staff. */
  stableId: string;
}

/**
 * Component to display active staff bonuses for a stable.
 * This fixes a hooks-in-JSX violation by extracting the useGame call.
 *
 * EXTRACTED FROM: src/routes/stable.$horseId.tsx
 */
export function StaffSupportPanel({ stableId }: StaffSupportPanelProps) {
  const hiredStaff = useGame((s) => s.hiredStaff);
  const staffForStable = hiredStaff?.filter((s) => s.stableId === stableId) ?? [];

  const nutritionist = staffForStable.find((s) => s.role === "nutritionist");
  const vet = staffForStable.find((s) => s.role === "veterinarian");
  const trainer = staffForStable.find((s) => s.role === "trainer");
  const farrier = staffForStable.find((s) => s.role === "farrier");
  const groom = staffForStable.find((s) => s.role === "groom");

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
