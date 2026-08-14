import { useEffect, useRef } from "react";
import { Mic2 } from "lucide-react";
import type { CommentaryLine } from "@/services/narrative/commentaryGenerator";
import { useTimeAgo } from "@/hooks/shared/useTimeAgo";

interface BroadcastCommentaryProps {
  commentary: CommentaryLine[];
  /** Wall-clock ms when the last commentary tick was received. */
  lastUpdatedAt?: number;
}

export function BroadcastCommentary({ commentary, lastUpdatedAt }: BroadcastCommentaryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const freshness = useTimeAgo(lastUpdatedAt ?? Date.now());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [commentary]);

  const visibleLines = commentary.slice(-8);


  return (
    <div className="mt-4 bg-broadcast-marquee/80 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden shadow-2xl transition-all duration-500">
      <div className="px-4 py-2.5 border-b border-white/10 bg-gradient-to-r from-white/10 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1 rounded bg-broadcast-accent/20">
            <Mic2 className="h-4 w-4 text-broadcast-accent" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground leading-tight">
              Live Commentary
            </span>
            <span className="text-[8px] text-muted-foreground uppercase tracking-widest font-medium">
              Race Broadcast Service
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-black/40 border border-white/5">
          <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse shadow-[0_0_8px_var(--destructive)]" />
          <span className="text-[8px] font-bold text-foreground uppercase tracking-tighter">
            Live
          </span>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="h-28 overflow-y-auto p-4 space-y-3 scroll-smooth scrollbar-hide bg-gradient-to-b from-transparent to-black/20"
      >
        {visibleLines.map((line, i) => {
          const isLatest = i === visibleLines.length - 1;
          return (
            <div
              key={line.id}
              className={`text-xs flex gap-3 transition-all duration-700 ${
                isLatest
                  ? "text-foreground font-semibold animate-in slide-in-from-right-4 fade-in"
                  : "text-muted-foreground font-normal"
              }`}
            >
              <span
                className={`text-[10px] tabular-nums flex-shrink-0 mt-0.5 ${isLatest ? "text-broadcast-accent" : "opacity-30"}`}
              >
                {line.timestamp.toFixed(1)}s
              </span>
              <div className="flex-1 leading-relaxed relative">
                {line.isHighImpact && isLatest && (
                  <span className="absolute -left-4 top-0 animate-ping h-2 w-2 rounded-full bg-broadcast-accent opacity-75" />
                )}
                {line.text}
              </div>
            </div>
          );
        })}
        {commentary.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-2 opacity-20">
            <Mic2 className="h-6 w-6" />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em]">System Initializing</p>
          </div>
        )}
      </div>
    </div>
  );
}
