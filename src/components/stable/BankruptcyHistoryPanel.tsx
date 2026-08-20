import { memo, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Skull } from "lucide-react";
import { cn } from "@/lib/cn";
import type { NewsItem } from "@/services/narrative/newsTypes";

interface BankruptcyHistoryPanelProps {
  news: NewsItem[];
  maxItems?: number;
}

function isBankruptcyNews(item: NewsItem): boolean {
  const text = `${item.headline} ${item.body}`.toLowerCase();
  return (
    item.category === "stable" &&
    item.importance === "high" &&
    (text.includes("bankrupt") || text.includes("liquidat") || text.includes("dissolut"))
  );
}

export const BankruptcyHistoryPanel = memo(function BankruptcyHistoryPanel({
  news,
  maxItems = 5,
}: BankruptcyHistoryPanelProps) {
  const bankruptcyEvents = useMemo(
    () =>
      news
        .filter(isBankruptcyNews)
        .sort((a, b) => b.day - a.day)
        .slice(0, maxItems),
    [news, maxItems],
  );

  if (bankruptcyEvents.length === 0) return null;

  return (
    <Card className="bg-slate-950/50 border-white/5 rounded-none shadow-xl border-l-4 border-l-red-500/40">
      <CardHeader className="bg-black/20 border-b border-white/5">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-cream/40 flex items-center gap-2">
          <Skull className="h-3 w-3 text-red-400" /> Dissolved Stables
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-white/5">
          {bankruptcyEvents.map((event) => {
            const stableLink = event.entityLinks?.find((l) => l.type === "stable");
            return (
              <div
                key={event.id}
                className={cn(
                  "flex items-start gap-3 p-3",
                  "hover:bg-white/[0.02] transition-colors",
                )}
              >
                <Building2 className="h-4 w-4 text-red-400/40 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-cream/80 truncate">
                      {event.headline}
                    </span>
                    <Badge className="bg-red-400/10 text-red-400 border-red-400/30 rounded-none text-[7px] font-black uppercase tracking-widest px-1">
                      Day {event.day}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-cream/40 leading-relaxed">{event.body}</p>
                  {stableLink && (
                    <Link
                      to="/npc-stables/$stableId"
                      params={{ stableId: stableLink.id }}
                      className="text-[9px] font-mono text-blue-400/60 hover:text-blue-400 uppercase tracking-widest"
                    >
                      View Records →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});
