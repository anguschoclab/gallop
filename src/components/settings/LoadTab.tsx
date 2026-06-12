import { Archive } from "lucide-react";
import type { SaveSlotMetadata } from "@/services/storage/saveManager";

interface LoadTabProps {
  saves: SaveSlotMetadata[];
  onLoad: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  isLoading: boolean;
  LedgerEntryComponent: React.FC<any>;
}

export function LoadTab({ saves, onLoad, onDelete, isLoading, LedgerEntryComponent }: LoadTabProps) {
  return (
    <div className="space-y-4">
      <div className="text-[10px] uppercase font-mono text-gold/40 border-b border-gold/10 pb-1 flex justify-between">
        <span>Archived Ledgers</span>
        <span>Sorted by Recency</span>
      </div>
      {saves.map((save) => (
        <LedgerEntryComponent
          key={save.id}
          save={save}
          onAction={() => onLoad(save.id)}
          onDelete={(e: React.MouseEvent) => onDelete(save.id, e)}
          actionLabel="Load"
          isLoading={isLoading}
        />
      ))}

      {saves.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-slate-800">
          <Archive className="h-12 w-12 text-slate-800 mx-auto mb-4" />
          <p className="text-cream-muted font-mono uppercase text-xs tracking-widest">
            No entries detected in archive
          </p>
        </div>
      )}
    </div>
  );
}
