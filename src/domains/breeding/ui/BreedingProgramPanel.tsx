import { useGame } from "@/platform/game/store";
import { ActiveProgramView } from "@/domains/breeding/ui/ActiveProgramView";
import { ArchetypePicker } from "@/domains/breeding/ui/ArchetypePicker";

export function BreedingProgramPanel() {
  const activeProgram = useGame((s) => s.activeBreedingProgram);
  return activeProgram ? <ActiveProgramView /> : <ArchetypePicker />;
}
