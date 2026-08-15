import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import { cn } from "@/lib/cn";
import type { NewsItem, NewsCategory } from "@/services/narrative/newsTypes";

interface AiActivityFeedProps {
  news: NewsItem[];
  filterActive?: boolean;
}

const NPC_CATEGORIES: NewsCategory[] = ["stable", "market", "racing"];

export function AiActivityFeed({ news, filterActive }: AiActivityFeedProps) {
  const filtered = filterActive ? news.filter((n) => NPC_CATEGORIES.includes(n.category)) : news;

  return (
    <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-emerald-400">
      <CardHeader className="bg-black/20 border-b border-white/5">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-cream/40 flex items-center gap-2">
          <Activity className="h-3 w-3 text-emerald-400" /> AI Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-[10px] font-mono text-cream/20 uppercase tracking-widest italic">
            No recent AI activity to report.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.slice(0, 20).map((item) => (
              <div key={item.id} className="p-3 space-y-1 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className="text-[8px] font-black uppercase tracking-widest border-white/10 text-cream/40 rounded-none"
                  >
                    {item.category}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-cream/20">Day {item.day}</span>
                    <div
                      data-testid="importance-indicator"
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        item.importance === "high"
                          ? "bg-red-400"
                          : item.importance === "medium"
                            ? "bg-gold"
                            : "bg-cream/20",
                      )}
                    />
                  </div>
                </div>
                <p className="text-xs font-bold text-cream/70 leading-tight">{item.headline}</p>
                <p className="text-[10px] text-cream/40 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
