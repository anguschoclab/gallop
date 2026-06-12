/**
 * AuctioneerChant.tsx - Live auctioneer log
 *
 * Displays the scrolling list of auctioneer lines with appropriate styling
 * for different event types.
 */

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import type { AuctioneerLine } from "@/services/auction/auctioneerService";

interface AuctioneerChantProps {
  lines: AuctioneerLine[];
}

export function AuctioneerChant({ lines }: AuctioneerChantProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div
      ref={scrollRef}
      className="h-[300px] overflow-y-auto p-4 flex flex-col gap-2 scroll-smooth bg-black/5 rounded-2xl border border-border/40"
    >
      {lines.map((line, idx) => (
        <div
          key={idx}
          className={cn(
            "text-sm font-medium transition-all duration-500 animate-in fade-in slide-in-from-left-4",
            line.type === "hammer"
              ? "text-primary font-black text-base py-2 uppercase tracking-tight border-y border-primary/10 my-1"
              : line.type === "chant"
                ? "text-muted-foreground font-mono"
                : "text-foreground font-bold",
          )}
        >
          {line.type === "hammer" && "🔨 "}
          {line.text}
        </div>
      ))}
      {lines.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground/30 font-bold italic">
          Waiting for the first call...
        </div>
      )}
    </div>
  );
}
