import { Trash2, Clock, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/core/common/formatting";
import { cn } from "@/lib/cn";
import type { SaveSlotMetadata } from "@/services/storage/saveManager";

interface LedgerEntryProps {
  save: SaveSlotMetadata;
  onAction: () => void;
  onDelete: (e: React.MouseEvent) => void;
  actionLabel: string;
  isLoading?: boolean;
}

export function LedgerEntry({
  save,
  onAction,
  onDelete,
  actionLabel,
  isLoading = false,
}: LedgerEntryProps) {
  const isAuto = save.isAutoSave;

  return (
    <div
      className={cn(
        "group relative border transition-all cursor-pointer",
        isAuto
          ? "bg-blue-900/5 border-blue-500/20 hover:border-blue-500/40"
          : "bg-slate-900/20 border-white/5 hover:border-gold/30",
      )}
      onClick={onAction}
    >
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1",
          isAuto ? "bg-blue-500/30 group-hover:bg-blue-400" : "bg-gold/10 group-hover:bg-gold",
        )}
      />

      <div className="p-4 pl-6 flex items-center justify-between">
        <div className="flex-1 grid grid-cols-12 gap-4 items-center">
          <div className="col-span-5 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-cream group-hover:text-gold transition-colors font-mono tracking-tight truncate">
                {save.name}
              </span>
              {isAuto && (
                <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1 border border-blue-500/30 font-mono font-bold">
                  AUTOSYNC
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(save.timestamp).toLocaleDateString()}{" "}
                {new Date(save.timestamp).toLocaleTimeString([], {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          <div className="col-span-3 font-mono text-center">
            <div className="text-[10px] text-slate-500 uppercase tracking-tighter">Timeline</div>
            <div className="text-cream group-hover:text-gold text-xs font-bold">
              DAY_{String(save.gameDay).padStart(4, "0")}
            </div>
          </div>

          <div className="col-span-4 font-mono text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-tighter">Horses</div>
            <div className="text-success text-xs font-bold truncate">
              {formatCurrency(save.cash)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 ml-6 pl-6 border-l border-white/5">
          <button
            type="button"
            className="text-slate-600 hover:text-destructive transition-colors p-1"
            onClick={onDelete}
            title="Delete save"
            aria-label={`Delete save ${save.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1 group/btn">
            <span
              className={cn(
                "text-[10px] font-bold uppercase transition-all opacity-0 group-hover:opacity-100",
                actionLabel === "Load" ? "text-blue-400" : "text-gold",
              )}
            >
              {actionLabel}
            </span>
            <div
              className={cn(
                "h-8 w-8 flex items-center justify-center border rounded-full transition-all shrink-0",
                actionLabel === "Load"
                  ? "border-blue-500/40 text-blue-500 group-hover/btn:bg-blue-500 group-hover/btn:text-slate-950"
                  : "border-gold/40 text-gold group-hover/btn:bg-gold group-hover/btn:text-slate-950",
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
