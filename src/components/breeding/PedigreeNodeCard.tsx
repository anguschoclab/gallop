import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useNavigate } from "@tanstack/react-router";
import { SilkDot } from "@/components/SilkDot";
import { getCoatColor } from "@/core/horse/uiHelpers";
import { cn } from "@/lib/utils";
import { genderSymbol } from "@/core/horse/gender";
import type { PedigreeFlowNode } from "@/lib/pedigreeGraph";

export const PedigreeNodeCard = memo(function PedigreeNodeCard({ data }: NodeProps<PedigreeFlowNode>) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (data.isReal && data.horseId) {
      navigate({ to: "/stable/$horseId", params: { horseId: data.horseId } });
    }
  };

  return (
    <>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />

      <div
        onClick={handleClick}
        className={cn(
          "rounded-sm border px-2 py-1.5 text-left transition-colors select-none relative",
          "bg-slate-900/80 border-white/10 shadow-lg",
          data.isReal && "cursor-pointer hover:border-gold/50 hover:bg-slate-800/80",
          !data.isReal && "opacity-40",
          data.inbreedCount >= 2 && "ring-2 ring-offset-1 ring-offset-slate-950",
          data.inbreedCount >= 2 && data.ringColor,
          data.generation === 0 && "border-gold/40 bg-black/40",
        )}
        style={{ width: 150, minHeight: 72 }}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          {data.isReal && data.coatColor ? (
            <SilkDot color={getCoatColor(data.coatColor)} size="sm" />
          ) : (
            <div className="w-4 h-4 rounded-full bg-white/10 shrink-0" />
          )}
          <span
            className={cn(
              "text-[10px] font-black truncate text-cream leading-tight uppercase tracking-tight",
              !data.isReal && "italic font-normal opacity-60",
            )}
            title={data.name}
          >
            {data.name}
          </span>
        </div>

        <div className="flex items-center justify-between gap-1 mt-auto">
          <div className="flex items-center gap-1.5 text-[8px] font-mono text-cream/40 uppercase tracking-widest">
            {data.gender && (
              <span
                className={cn(
                  data.gender === "colt" || data.gender === "horse" || data.gender === "gelding"
                    ? "text-blue-400/60"
                    : "text-pink-400/60",
                )}
              >
                {genderSymbol(data.gender as any)}
              </span>
            )}
            <span className="opacity-60">{data.isSire ? "S" : "D"}</span>
            {data.birthYear && <span className="text-cream/20">b.{data.birthYear}</span>}
          </div>

          {data.bestBeyer !== undefined && (
            <span className="text-[8px] font-mono font-black text-gold bg-gold/10 px-1 rounded-sm">
              {data.bestBeyer}
            </span>
          )}
        </div>
      </div>
    </>
  );
});

