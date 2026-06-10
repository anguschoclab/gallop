import { useGame } from "@/game/store";
import { ActiveProgramView } from "./ActiveProgramView";
import { ArchetypePicker } from "./ArchetypePicker";

export function BreedingProgramPanel() {
  const activeProgram = useGame((s) => s.activeBreedingProgram);
  return activeProgram ? <ActiveProgramView /> : <ArchetypePicker />;
}
