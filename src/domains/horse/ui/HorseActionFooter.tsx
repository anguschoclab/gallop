import { Link } from "@tanstack/react-router";
import { Button } from "@/shared/ui/button";
import type { Horse } from "@/platform/game/types";
import { isPlayerOwned } from "@/domains/horse/application/horseFacade";
import { Eye, Calendar } from "lucide-react";

interface HorseActionFooterProps {
  horse: Horse;
  onClickStopPropagation?: boolean;
}

export function HorseActionFooter({
  horse,
  onClickStopPropagation = true,
}: HorseActionFooterProps) {
  if (!isPlayerOwned(horse)) return null;

  const stopProp = onClickStopPropagation
    ? (e: React.MouseEvent) => e.stopPropagation()
    : undefined;

  return (
    <div className="p-3 bg-black/40 border-t border-white/5 flex gap-2">
      <Link
        to="/stable/$horseId"
        params={{ horseId: horse.id }}
        className="flex-1"
        onClick={stopProp}
      >
        <Button
          variant="outline"
          className="w-full h-8 text-[9px] font-black uppercase tracking-wide border-white/10 hover:bg-primary/10 hover:text-primary hover:border-primary/30 rounded-none text-foreground/60"
        >
          <Eye className="h-3 w-3 mr-1.5" /> Dossier
        </Button>
      </Link>
      <Link to="/scheduler" className="flex-1" onClick={stopProp}>
        <Button
          variant="outline"
          className="w-full h-8 text-[9px] font-black uppercase tracking-wide border-white/10 hover:bg-blue-400/10 hover:text-blue-400 hover:border-blue-400/30 rounded-none text-foreground/60"
        >
          <Calendar className="h-3 w-3 mr-1.5" /> Deploy
        </Button>
      </Link>
    </div>
  );
}
